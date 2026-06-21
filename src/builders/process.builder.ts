import type { BPMNModdle } from "bpmn-moddle";

export class ProcessBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(id: string, name: string | undefined, elements: any[], flows: any[]) {
    return this.moddle.create("bpmn:Process", {
      id,
      name,
      isExecutable: false,
      flowElements: [...elements, ...flows],
    });
  }
}