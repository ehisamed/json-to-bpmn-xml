import type { BPMNModdle as BPMNModdleInstance } from "bpmn-moddle";
import { NODE_MAP } from "../constants/node-map";
import { INode } from "../types/Node";

export class NodeBuilder {
  constructor(private moddle: BPMNModdleInstance) {}

  build(node: INode) {
    const type = NODE_MAP[node.type];

    return this.moddle.create(type, {
      id: node.id,
      name: node.name,
    });
  }
}
