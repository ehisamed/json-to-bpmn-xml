import type { ImportWarning } from "../src/index";

export interface ImportPreviewCase {
  source: string;
  origin: "model" | "xml";
  importable: boolean;
  warnings: ImportWarning[];
}

export interface CoverageGroup {
  feature: string;
  count: number;
  sources: string[];
  elements: string[];
}

export interface PreviewCoverageReport {
  total: number;
  importable: number;
  withGaps: number;
  gaps: CoverageGroup[];
  droppedFlows: CoverageGroup[];
  informational: CoverageGroup[];
  cases: ImportPreviewCase[];
}

function featureName(warning: ImportWarning): string {
  const elementType = warning.message.match(/(?:Element|Artifact) bpmn:([A-Za-z]+)/)?.[1];
  if (elementType) return elementType === "SubProcess" ? "Empty/collapsed SubProcess" : elementType;
  if (warning.message.includes("Empty or unsupported subprocess")) return "Empty/collapsed SubProcess";
  if (warning.message.includes("data input/output associations")) return "Data input/output associations";
  if (warning.code === "conversion-failed") return "JSON regeneration failure";
  if (warning.code === "diagram-rebuilt") return "BPMNDI layout regenerated";
  if (warning.code === "dropped-flow") return "Dependent sequence/message flows";
  return warning.message;
}

function groupWarnings(
  cases: ImportPreviewCase[],
  include: (warning: ImportWarning) => boolean,
): CoverageGroup[] {
  const groups = new Map<string, { sources: Set<string>; elements: Set<string>; occurrences: Set<string> }>();
  for (const entry of cases) {
    for (const warning of entry.warnings.filter(include)) {
      const feature = featureName(warning);
      const group = groups.get(feature) ?? { sources: new Set(), elements: new Set(), occurrences: new Set() };
      group.sources.add(entry.source);
      if (warning.elementId) group.elements.add(warning.elementId);
      // One unsupported subprocess can produce two warnings for the same ID.
      group.occurrences.add(`${entry.source}\0${warning.elementId ?? warning.message}`);
      groups.set(feature, group);
    }
  }
  return [...groups].map(([feature, group]) => ({
    feature,
    count: group.occurrences.size,
    sources: [...group.sources].sort(),
    elements: [...group.elements].sort(),
  })).sort((left, right) => right.count - left.count || left.feature.localeCompare(right.feature));
}

export function buildCoverageReport(cases: ImportPreviewCase[]): PreviewCoverageReport {
  const sorted = [...cases].sort((a, b) => a.source.localeCompare(b.source));
  return {
    total: sorted.length,
    importable: sorted.filter((entry) => entry.importable).length,
    withGaps: sorted.filter((entry) => entry.warnings.some((warning) => warning.code !== "diagram-rebuilt")).length,
    gaps: groupWarnings(sorted, (warning) => ["unsupported", "missing-reference", "conversion-failed", "parse"].includes(warning.code)),
    droppedFlows: groupWarnings(sorted, (warning) => warning.code === "dropped-flow"),
    informational: groupWarnings(sorted, (warning) => warning.code === "diagram-rebuilt"),
    cases: sorted,
  };
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function groupTable(groups: CoverageGroup[]): string {
  if (!groups.length) return "Нет.\n";
  return [
    "| Причина или тип | Элементов | Источники |",
    "| --- | ---: | --- |",
    ...groups.map((group) => `| ${escapeCell(group.feature)} | ${group.count} | ${group.sources.map(escapeCell).join(", ")} |`),
    "",
  ].join("\n");
}

export function coverageMarkdown(report: PreviewCoverageReport): string {
  const lines = [
    "# Покрытие обратного импорта BPMN → JSON",
    "",
    `Проверено XML: ${report.total}; получена JSON-модель: ${report.importable}; есть предупреждения о потере данных/ошибках: ${report.withGaps}.`,
    "",
    "Список ниже сформирован из реальных предупреждений `importBpmn`, а не заявляет полного семантического сравнения XML и JSON. Исходный XML сохранён для каждого примера.",
    "",
    "## Не реализовано или не восстановлено в JSON",
    "",
    groupTable(report.gaps),
    "## Потери связанных flow",
    "",
    groupTable(report.droppedFlows),
    "`dropped-flow` обычно является следствием пропуска узла; это не отдельный неподдерживаемый тип BPMN.",
    "",
    "## Информационные предупреждения",
    "",
    groupTable(report.informational),
    "`diagram-rebuilt` означает пересчёт координат при повторной генерации; оно не входит в список отсутствующих BPMN-элементов.",
    "",
    "## По каждому XML",
    "",
    "| Источник | JSON | Предупреждения, кроме DI |",
    "| --- | --- | --- |",
    ...report.cases.map((entry) => {
      const warnings = entry.warnings.filter((warning) => warning.code !== "diagram-rebuilt");
      return `| ${escapeCell(entry.source)} | ${entry.importable ? "да" : "нет"} | ${warnings.length ? warnings.map((warning) => escapeCell(`${warning.code}${warning.elementId ? ` (${warning.elementId})` : ""}: ${warning.message}`)).join("<br>") : "—"} |`;
    }),
    "",
    "Полные предупреждения и ID элементов доступны в `coverage.json` и в JSON каждого примера.",
    "",
  ];
  return lines.join("\n");
}
