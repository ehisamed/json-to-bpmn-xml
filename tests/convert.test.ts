import { convert } from "../src/index";
import type { ProcessModel } from "../src/types/process";
import { describe, it, expect } from "vitest";
import {
  advancedOrder,
  boundaryAndConditional,
  lanesSimpleFlow,
} from "../fixtures/models";

describe("convert()", () => {
  const model: ProcessModel = {
    id: "process_1",
    name: "Simple Process",
    nodes: [
      { id: "start", type: "start" },
      { id: "task1", type: "userTask", name: "Do something" },
      { id: "end", type: "end" },
    ],
    edges: [
      { id: "e1", source: "start", target: "task1" },
      { id: "e2", source: "task1", target: "end" },
    ],
  };

  it("converts JSON BPMN model to XML", async () => {
    const xml = await convert(model);

    expect(xml).toContain("<bpmn:definitions");
    expect(xml).toContain('id="process_1_definitions"');
    expect(xml).toContain(
      'xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd"',
    );
    expect(xml).not.toContain('$attrs="[object Object]"');
    expect(xml).toContain('<bpmn:startEvent id="start">');
    expect(xml).toContain(
      '<bpmn:sequenceFlow id="e1" sourceRef="start" targetRef="task1"',
    );
    expect(xml).toContain('<bpmn:endEvent id="end">');
    expect(xml).not.toContain("laneId=");
    expect(xml).not.toContain("<bpmn:collaboration");
  });

  it("returns formatted XML with declaration on the first line", async () => {
    const xml = await convert(model);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(
      true,
    );
  });

  it("generates clean XML with lanes, collaboration and laneSet", async () => {
    const xml = await convert(lanesSimpleFlow);

    expect(xml).toContain("<bpmn:laneSet");
    expect(xml).toContain('<bpmn:lane id="Lane_User" name="User">');
    expect(xml).toContain("<bpmn:flowNodeRef>Start_1</bpmn:flowNodeRef>");
    expect(xml).toContain("<bpmn:collaboration");
    expect(xml).toContain('bpmnElement="Lane_User"');
    expect(xml).not.toContain("laneId=");
    expect(xml).toContain(
      'xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd"',
    );
  });

  it("converts the advanced order fixture", async () => {
    const xml = await convert(advancedOrder);

    expect(xml).toContain('id="Process_Advanced_Order"');
    expect(xml).toContain("<bpmn:exclusiveGateway");
    expect(xml).toContain("<bpmn:laneSet");
    expect(xml).not.toContain("laneId=");
  });

  it("emits boundary event, conditional flow, and default flow", async () => {
    const xml = await convert(boundaryAndConditional);

    expect(xml).toContain("<bpmn:boundaryEvent");
    expect(xml).toContain('attachedToRef="Approve"');
    expect(xml).toContain("<bpmn:timerEventDefinition");
    expect(xml).toContain("<bpmn:conditionExpression");
    expect(xml).toContain("approved = true");
    expect(xml).toContain('default="Flow_Decision_Rejected"');
  });

  it("throws on unknown laneId", async () => {
    await expect(
      convert({
        id: "bad",
        nodes: [{ id: "start", type: "start", laneId: "missing" }],
        edges: [],
      }),
    ).rejects.toThrow(/unknown laneId/);
  });

  it("throws on unknown edge source", async () => {
    await expect(
      convert({
        id: "bad",
        nodes: [{ id: "start", type: "start" }],
        edges: [{ id: "e1", source: "nope", target: "start" }],
      }),
    ).rejects.toThrow(/unknown source/);
  });
});
