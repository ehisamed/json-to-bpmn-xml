import type { BPMNModdle as BPMNModdleInstance } from "bpmn-moddle";
import { NODE_MAP } from "../constants/node-map";
import type { INode } from "../types/node";

export class NodeBuilder {
  constructor(private moddle: BPMNModdleInstance) {}

  build(node: INode) {
    const type = NODE_MAP[node.type];
    const attrs: Record<string, unknown> = {
      id: node.id,
    };

    if (node.name !== undefined) {
      attrs.name = node.name;
    }

    if (
      (node.type === "start" ||
        node.type === "intermediateCatch" ||
        node.type === "boundaryEvent") &&
      node.eventDefinition
    ) {
      const defType =
        node.eventDefinition === "timer"
          ? "bpmn:TimerEventDefinition"
          : "bpmn:MessageEventDefinition";

      attrs.eventDefinitions = [
        this.moddle.create(defType, {
          id: `${node.id}_${node.eventDefinition}Def`,
        }),
      ];
    }

    if (node.multiInstance !== undefined && node.multiInstance !== false) {
      const sequential =
        typeof node.multiInstance === "object"
          ? Boolean(node.multiInstance.sequential)
          : false;

      const loopAttrs: Record<string, unknown> = {};
      if (sequential) {
        loopAttrs.isSequential = true;
      }

      attrs.loopCharacteristics = this.moddle.create(
        "bpmn:MultiInstanceLoopCharacteristics",
        loopAttrs,
      );
    }

    return this.moddle.create(type, attrs);
  }
}
