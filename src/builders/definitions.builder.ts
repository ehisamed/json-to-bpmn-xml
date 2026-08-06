import type { BPMNModdle } from "bpmn-moddle";

export class DefinitionsBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(definitionsId: string, rootElements: any[]) {
    const definitions = this.moddle.create("bpmn:Definitions", {
      id: `${definitionsId}_definitions`,
      targetNamespace: "http://www.omg.org/spec/BPMN/20100524/MODEL",
      rootElements,
    });

    definitions.$attrs!["xsi:schemaLocation"] =
      "http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd";

    return definitions;
  }
}
