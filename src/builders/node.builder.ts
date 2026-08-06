import type { BPMNModdle as BPMNModdleInstance } from "bpmn-moddle";
import { NODE_MAP } from "../constants/node-map";
import { INode } from "../types/node";

export class NodeBuilder {
  constructor(private moddle: BPMNModdleInstance) {}

  build(node: INode) {
    const type = NODE_MAP[node.type];

    const attrs: Record<string, string> = {
      id: node.id,
    };

    if (node.name !== undefined) {
      attrs.name = node.name;
    }

    return this.moddle.create(type, attrs);
  }
}
