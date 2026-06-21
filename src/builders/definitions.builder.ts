import type { BPMNModdle } from "bpmn-moddle";

export class DefinitionsBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(process: any) {
    const definitions = this.moddle.create("bpmn:Definitions", {
      id: `${process.id}_definitions`,
      targetNamespace: "http://www.omg.org/spec/BPMN/20100524/MODEL",
      rootElements: [process],
    });

    definitions.$attrs!["xsi:schemaLocation"] =
      "http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd";

    return definitions;
  }
}
