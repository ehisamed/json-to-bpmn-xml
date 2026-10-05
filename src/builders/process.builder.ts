import type { BPMNModdle } from "bpmn-moddle";

export class ProcessBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(
    id: string,
    name: string | undefined,
    flowElements: any[],
    laneSets?: any[],
    artifacts?: any[],
  ) {
    const attrs: Record<string, unknown> = {
      id,
      isExecutable: false,
      flowElements,
    };

    if (name !== undefined) {
      attrs.name = name;
    }

    if (laneSets?.length) {
      attrs.laneSets = laneSets;
    }
    if (artifacts?.length) {
      attrs.artifacts = artifacts;
    }

    return this.moddle.create("bpmn:Process", attrs);
  }
}
