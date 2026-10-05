import type { BPMNModdle as BPMNModdleInstance } from "bpmn-moddle";
import { NODE_MAP } from "../constants/node-map";
import type { INode } from "../types/node";

export class NodeBuilder {
  constructor(private moddle: BPMNModdleInstance) {}

  build(node: INode) {
    const type =
      node.type === "subProcess" && node.subProcess?.subProcessType === "transaction"
        ? "bpmn:Transaction"
        : NODE_MAP[node.type];
    const attrs: Record<string, unknown> = {
      id: node.id,
    };

    if (node.name !== undefined) {
      attrs.name = node.name;
    }

    if (node.type === "subProcess" && node.subProcess?.subProcessType === "event") {
      attrs.triggeredByEvent = true;
    }

    if (node.calledElement !== undefined) {
      attrs.calledElement = node.calledElement;
    }

    if (node.implementation !== undefined) {
      attrs.implementation = node.implementation;
    }

    if (node.scriptFormat !== undefined) {
      attrs.scriptFormat = node.scriptFormat;
    }

    if (node.script !== undefined) {
      attrs.script = node.script;
    }

    if (
      (node.type === "start" ||
        node.type === "end" ||
        node.type === "intermediateCatch" ||
        node.type === "boundaryEvent") &&
      node.eventDefinition
    ) {
      const defTypeByEvent = {
        timer: "bpmn:TimerEventDefinition",
        message: "bpmn:MessageEventDefinition",
        signal: "bpmn:SignalEventDefinition",
        conditional: "bpmn:ConditionalEventDefinition",
        error: "bpmn:ErrorEventDefinition",
        escalation: "bpmn:EscalationEventDefinition",
        terminate: "bpmn:TerminateEventDefinition",
        cancel: "bpmn:CancelEventDefinition",
        compensation: "bpmn:CompensateEventDefinition",
        link: "bpmn:LinkEventDefinition",
      } as const;
      const defType = defTypeByEvent[node.eventDefinition];

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
