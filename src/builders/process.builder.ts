import type { BPMNModdle } from "bpmn-moddle";

export class ProcessBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(
    id: string,
    name: string | undefined,
    elements: any[],
    flows: any[],
    laneSets?: any[],
  ) {
    const attrs: Record<string, unknown> = {
      id,
      isExecutable: false,
      flowElements: [...elements, ...flows],
    };

    if (name !== undefined) {
      attrs.name = name;
    }

    if (laneSets?.length) {
      attrs.laneSets = laneSets;
    }

    return this.moddle.create("bpmn:Process", attrs);
  }
}
