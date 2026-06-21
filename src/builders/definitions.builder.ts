import type { BPMNModdle } from "bpmn-moddle";

export class DefinitionsBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(process: any) {
    return this.moddle.create("bpmn:Definitions", {
      id: `${process.id}_definitions`,
      targetNamespace: "http://bpmn.io/schema/bpmn",
      rootElements: [process],
      $attrs: {
        "xsi:schemaLocation":
          "http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd",
      },
    });
  }
}