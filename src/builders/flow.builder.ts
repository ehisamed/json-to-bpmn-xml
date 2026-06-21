import type { BPMNModdle, FlowNode } from "bpmn-moddle";
import type { IEdge } from "../types/edge";

export interface FlowMeta {
  id: string;
  source: string;
  target: string;
  flow: any;
}

export class FlowBuilder {
  constructor(private moddle: BPMNModdle) {}

  build(edge: IEdge, elementById: Map<string, FlowNode>, index: number) {
    const source = elementById.get(String(edge.source));
    const target = elementById.get(String(edge.target));

    const flow = this.moddle.create("bpmn:SequenceFlow", {
      id: edge.id ?? `Flow_${index + 1}`,
      name: edge.name,
      sourceRef: source,
      targetRef: target,
    });

    if (source) {
      source.outgoing = [...(source.outgoing ?? []), flow];
    }

    if (target) {
      target.incoming = [...(target.incoming ?? []), flow];
    }

    return flow;
  }

  buildMeta(edge: IEdge, flow: any, index: number): FlowMeta {
    return {
      id: String(edge.id ?? `Flow_${index + 1}`),
      source: String(edge.source),
      target: String(edge.target),
      flow,
    };
  }
}