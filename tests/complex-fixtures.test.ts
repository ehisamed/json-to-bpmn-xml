import { convert } from "../src/index";
import {
  accountsPayable,
  orderFulfillment,
  loanApproval,
  incidentResponse,
  advancedOrder,
} from "../fixtures/models";
import { describe, it, expect } from "vitest";

const complexFixtures = [
  { name: "accountsPayable", model: accountsPayable },
  { name: "orderFulfillment", model: orderFulfillment },
  { name: "loanApproval", model: loanApproval },
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

  it("orderFulfillment has two pools and event gateway", async () => {
    const xml = await convert(orderFulfillment);
    expect(xml).toContain('name="Customer Service"');
    expect(xml).toContain('name="Warehouse"');
    expect(xml).toContain("<bpmn:eventBasedGateway");
    expect(xml).toContain("<bpmn:messageFlow");
  });

  it("loanApproval wires bureau message start", async () => {
    const xml = await convert(loanApproval);
    expect(xml).toContain('name="Bank"');
    expect(xml).toContain('name="Credit Bureau"');
    expect(xml).toContain("MF_Request");
  });

  it("incidentResponse uses timer start on ops", async () => {
    const xml = await convert(incidentResponse);
    expect(xml).toContain('name="Support Desk"');
    expect(xml).toContain('name="Operations"');
    expect(xml).toContain("<bpmn:timerEventDefinition");
  });
});
