import { BpmnConverter } from "../converter/BpmnConverter";
import type { ProcessModel } from "../types/process";
import { describe, it, expect } from "vitest";

describe("BpmnConverter", () => {
  it("creates a converter instance and generates valid BPMN XML", async () => {
    const converter = new BpmnConverter();

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

    const xml = await converter.convert(model);

    expect(xml).toContain("<bpmn:process");
    expect(xml).toContain('isExecutable="false"');
    expect(xml).toContain('bpmnElement="start"');
    expect(xml).toContain("<bpmndi:BPMNDiagram");
    expect(xml).toContain("<di:waypoint");
  });

  it("supports exclusive and parallel gateways", async () => {
    const converter = new BpmnConverter();

    const model: ProcessModel = {
      id: "process_gw",
      nodes: [
        { id: "start", type: "start" },
        { id: "xor", type: "exclusiveGateway", name: "Xor" },
        { id: "and", type: "parallelGateway", name: "And" },
        { id: "end", type: "end" },
      ],
      edges: [
        { id: "e1", source: "start", target: "xor" },
        { id: "e2", source: "xor", target: "and" },
        { id: "e3", source: "and", target: "end" },
      ],
    };

    const xml = await converter.convert(model);

    expect(xml).toContain("<bpmn:exclusiveGateway");
    expect(xml).toContain("<bpmn:parallelGateway");
  });
});
