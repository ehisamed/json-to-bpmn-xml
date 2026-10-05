import { BpmnModdle } from "bpmn-moddle";
import { describe, expect, it } from "vitest";
import { convert } from "../src/index";
import * as fixtureExports from "../fixtures/models";
import type { ProcessModel } from "../src/types/process";

function isProcessModel(value: unknown): value is ProcessModel {
  if (!value || typeof value !== "object") return false;
  const model = value as ProcessModel;
  return (
    typeof model.id === "string" &&
    ((Array.isArray(model.nodes) && model.nodes.length > 0) ||
      (Array.isArray(model.processes) && model.processes.length > 0))
  );
}

const fixtures = Object.entries(fixtureExports)
  .filter(([, value]) => isProcessModel(value))
  .map(([name, model]) => ({ name, model }))
  .sort((a, b) => a.name.localeCompare(b.name));

describe("fixture BPMN round-trip", () => {
  for (const { name, model } of fixtures) {
    it(`parses generated XML for ${name}`, async () => {
      const xml = await convert(model);
      const moddle = new BpmnModdle();
      const { rootElement, warnings } = await moddle.fromXML(xml);

      expect(rootElement.$type).toBe("bpmn:Definitions");
      expect(warnings).toEqual([]);
    });
  }
});
