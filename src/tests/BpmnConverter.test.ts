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
    expect(xml).toContain("isExecutable=\"false\"");
    expect(xml).toContain("bpmnElement=\"start\"");
  });
});