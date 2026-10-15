import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { convert, importBpmn, type ProcessModel } from "../src/index";
import * as fixtureExports from "../fixtures/models";
import { buildCoverageReport, coverageMarkdown, type ImportPreviewCase } from "../scripts/preview-coverage";

function isProcessModel(value: unknown): value is ProcessModel {
  return !!value && typeof value === "object" && typeof (value as ProcessModel).id === "string" &&
    (Array.isArray((value as ProcessModel).nodes) || Array.isArray((value as ProcessModel).processes));
}

describe("preview reverse-import coverage", () => {
  it("groups real warnings from generated model XML and hand-written XML", async () => {
    const cases: ImportPreviewCase[] = [];
    for (const [name, model] of Object.entries(fixtureExports)) {
      if (!isProcessModel(model)) continue;
      const result = await importBpmn(await convert(model));
      cases.push({ source: name, origin: "model", importable: !!result.model, warnings: result.warnings });
    }
    const xml = await readFile(new URL("../fixtures/xml/unsupported-ad-hoc.bpmn", import.meta.url), "utf8");
    const result = await importBpmn(xml);
    cases.push({ source: "unsupported-ad-hoc", origin: "xml", importable: !!result.model, warnings: result.warnings });

    const report = buildCoverageReport(cases);
    expect(report.total).toBe(40);
    expect(report.importable).toBe(40);
    expect(report.gaps.map((group) => group.feature)).toEqual(expect.arrayContaining([
      "DataStoreReference", "DataObjectReference", "TextAnnotation", "Group",
      "Association", "AdHocSubProcess", "Empty/collapsed SubProcess", "Data input/output associations",
    ]));
    expect(report.gaps.some((group) => group.feature === "BPMNDI layout regenerated")).toBe(false);
    expect(report.dependentLosses[0]?.feature).toBe("Dependent sequence/message flows");
    expect(coverageMarkdown(report)).toContain("accountsPayable.bpmn | model");
    expect(coverageMarkdown(report)).toContain("unsupported-ad-hoc.bpmn | XML fixture");
  });

  it("deduplicates repeated warnings for the same BPMN element", () => {
    const report = buildCoverageReport([{
      source: "from-models/example",
      origin: "model",
      importable: true,
      warnings: [
        { code: "unsupported", message: "Empty or unsupported subprocess was skipped", elementId: "Sub" },
        { code: "unsupported", message: "Element bpmn:SubProcess is retained only in sourceXml", elementId: "Sub" },
        { code: "diagram-rebuilt", message: "DI changed" },
      ],
    }]);
    expect(report.gaps).toEqual([expect.objectContaining({ feature: "Empty/collapsed SubProcess", count: 1 })]);
    expect(report.informational).toEqual([expect.objectContaining({ feature: "BPMNDI layout regenerated" })]);
  });
});
