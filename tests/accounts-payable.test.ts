import { convert } from "../src/index";
import { accountsPayable } from "../fixtures/models/accounts-payable";
import { describe, it, expect } from "vitest";

describe("accountsPayable fixture", () => {
  it("emits collaboration with two pools, message flows and advanced elements", async () => {
    const xml = await convert(accountsPayable);

    expect(xml).toContain("<bpmn:collaboration");
    expect(xml).toContain('name="Process Payable"');
    expect(xml).toContain('name="Schedule Payments"');
    expect(xml).toContain("<bpmn:messageFlow");
    expect(xml).toContain("<bpmn:eventBasedGateway");
    expect(xml).toContain("<bpmn:intermediateCatchEvent");
    expect(xml).toContain("<bpmn:timerEventDefinition");
    expect(xml).toContain("<bpmn:messageEventDefinition");
    expect(xml).toContain("<bpmn:subProcess");
    expect(xml).toContain("<bpmn:dataStoreReference");
    expect(xml).toContain("<bpmn:multiInstanceLoopCharacteristics");
    expect(xml).toContain("<bpmn:task ");
    expect(xml).not.toContain("laneId=");
  });
});
