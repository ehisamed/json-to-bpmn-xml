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

    const attrs: Record<string, unknown> = {
      id: edge.id ?? `Flow_${index + 1}`,
      sourceRef: source,
      targetRef: target,
    };

    if (edge.name !== undefined) {
      attrs.name = edge.name;
    }

    const flow = this.moddle.create("bpmn:SequenceFlow", attrs);

    if (edge.condition !== undefined) {
      flow.conditionExpression = this.moddle.create("bpmn:FormalExpression", {
        body: edge.condition,
      });
    }

    if (edge.isDefault) {
      (source as any).default = flow;
    }

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

  buildMessageFlow(
    edge: { id?: string; source: string; target: string; name?: string },
    elementById: Map<string, FlowNode>,
    index: number,
  ) {
    const source = elementById.get(String(edge.source));
    const target = elementById.get(String(edge.target));

    const attrs: Record<string, unknown> = {
      id: edge.id ?? `MessageFlow_${index + 1}`,
      sourceRef: source,
      targetRef: target,
    };

    if (edge.name !== undefined) {
      attrs.name = edge.name;
    }

    return this.moddle.create("bpmn:MessageFlow", attrs);
  }
}
