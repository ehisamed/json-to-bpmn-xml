import { convert } from "../src/index";
import {
  accountsPayable,
  incidentResponse,
  advancedOrder,
} from "../fixtures/models";
import { describe, it, expect } from "vitest";

const complexFixtures = [
  { name: "accountsPayable", model: accountsPayable },
  { name: "incidentResponse", model: incidentResponse },
  { name: "advancedOrder", model: advancedOrder },
] as const;

describe("complex fixtures", () => {
  for (const { name, model } of complexFixtures) {
    it(`converts ${name} without laneId leakage`, async () => {
      const xml = await convert(model);
      expect(xml).toContain("<?xml");
      expect(xml).toContain("<bpmn:definitions");
      expect(xml).toContain("<bpmndi:BPMNDiagram");
      expect(xml).not.toContain("laneId=");
    });
  }

  it("accountsPayable exposes collaboration features", async () => {
    const xml = await convert(accountsPayable);
    expect(xml).toContain("<bpmn:collaboration");
    expect(xml).toContain("<bpmn:messageFlow");
    expect(xml).toContain("<bpmn:eventBasedGateway");
    expect(xml).toContain("<bpmn:dataStoreReference");
  });

  it("incidentResponse uses timer start on ops", async () => {
    const xml = await convert(incidentResponse);
    expect(xml).toContain('name="Support Desk"');
    expect(xml).toContain('name="Operations"');
    expect(xml).toContain("<bpmn:timerEventDefinition");
  });
});
