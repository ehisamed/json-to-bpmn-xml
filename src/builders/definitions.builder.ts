import type { BPMNModdle } from "bpmn-moddle";

export class DefinitionsBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(process: any, collaboration: any) {
    const rootElements = [process];
    if (collaboration) rootElements.push(collaboration);

    const definitions = this.moddle.create("bpmn:Definitions", {
      id: `${process.id}_definitions`,
      targetNamespace: "http://bpmn.io/schema/bpmn",
      rootElements,
    });

    return definitions;
  }
}
