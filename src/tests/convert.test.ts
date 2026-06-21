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

    expect(xml).toContain('<bpmn:definitions');
    expect(xml).toContain('id="process_1_definitions"');
    expect(xml).toContain(
      'xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd"',
    );
    expect(xml).not.toContain('$attrs="[object Object]"');
    expect(xml).toContain('<bpmn:startEvent id="start">');
    expect(xml).toContain('<bpmn:sequenceFlow id="e1" sourceRef="start" targetRef="task1"');
    expect(xml).toContain('<bpmn:endEvent id="end">');
  });

  it("returns formatted XML with declaration on the first line", async () => {
    const xml = await convert(model);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
  });
});