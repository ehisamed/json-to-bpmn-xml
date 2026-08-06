import type { BPMNModdle } from "bpmn-moddle";
import { BIOC_NS, COLOR_NS } from "../types/di-color";

export class DefinitionsBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(
    definitionsId: string,
    rootElements: any[],
    options?: { withDiColors?: boolean },
  ) {
    const definitions = this.moddle.create("bpmn:Definitions", {
      id: `${definitionsId}_definitions`,
      targetNamespace: "http://www.omg.org/spec/BPMN/20100524/MODEL",
      rootElements,
    });

    definitions.$attrs!["xsi:schemaLocation"] =
      "http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd";

    if (options?.withDiColors) {
      definitions.$attrs!["xmlns:bioc"] = BIOC_NS;
      definitions.$attrs!["xmlns:color"] = COLOR_NS;
    }

    return definitions;
  }
}
