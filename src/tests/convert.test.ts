import { convert } from "../index";
import { ProcessModel } from "../types/process";
import { describe, it, expect } from "vitest";

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
    const withLanes: ProcessModel = {
      id: "process_lanes",
      name: "Lane Process",
      lanes: [
        { id: "Lane_A", name: "User" },
        { id: "Lane_B", name: "System" },
      ],
      nodes: [
        { id: "start", type: "start", laneId: "Lane_A" },
        { id: "task1", type: "userTask", name: "Fill form", laneId: "Lane_A" },
        {
          id: "task2",
          type: "serviceTask",
          name: "Process",
          laneId: "Lane_B",
        },
        { id: "end", type: "end", laneId: "Lane_B" },
      ],
      edges: [
        { id: "e1", source: "start", target: "task1" },
        { id: "e2", source: "task1", target: "task2" },
        { id: "e3", source: "task2", target: "end" },
      ],
    };

    const xml = await convert(withLanes);

    expect(xml).toContain("<bpmn:laneSet");
    expect(xml).toContain('<bpmn:lane id="Lane_A" name="User">');
    expect(xml).toContain("<bpmn:flowNodeRef>start</bpmn:flowNodeRef>");
    expect(xml).toContain("<bpmn:flowNodeRef>task1</bpmn:flowNodeRef>");
    expect(xml).toContain("<bpmn:collaboration");
    expect(xml).toContain('bpmnElement="Lane_A"');
    expect(xml).not.toContain("laneId=");
    expect(xml).toContain(
      'xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd"',
    );
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
