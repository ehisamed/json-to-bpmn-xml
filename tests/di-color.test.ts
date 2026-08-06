import { convert } from "../src/index";
import { describe, it, expect } from "vitest";

describe("DI colors", () => {
  it("emits bioc/color attributes and namespaces when color is set", async () => {
    const xml = await convert({
      id: "ColorDemo",
      nodes: [
        {
          id: "start",
          type: "start",
          color: { stroke: "#0d4372", fill: "#bbdefb" },
        },
        {
          id: "end",
          type: "end",
          color: { stroke: "#205022", fill: "#c8e6c9" },
        },
      ],
      edges: [{ id: "e1", source: "start", target: "end" }],
    });

    expect(xml).toContain('xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0"');
    expect(xml).toContain(
      'xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0"',
    );
    expect(xml).toContain('bioc:stroke="#0d4372"');
    expect(xml).toContain('bioc:fill="#bbdefb"');
    expect(xml).toContain('color:background-color="#bbdefb"');
    expect(xml).toContain('color:border-color="#0d4372"');
    expect(xml).toContain('bioc:stroke="#205022"');
  });

  it("omits bioc namespaces when no colors are used", async () => {
    const xml = await convert({
      id: "NoColor",
      nodes: [
        { id: "start", type: "start" },
        { id: "end", type: "end" },
      ],
      edges: [{ id: "e1", source: "start", target: "end" }],
    });

    expect(xml).not.toContain("xmlns:bioc");
    expect(xml).not.toContain("bioc:stroke");
  });
});
