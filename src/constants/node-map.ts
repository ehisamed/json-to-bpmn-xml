import { NodeType } from "../types/Node";

export const NODE_MAP: Record<NodeType, string> = {
  start: "bpmn:StartEvent",
  end: "bpmn:EndEvent",
  userTask: "bpmn:UserTask",
  serviceTask: "bpmn:ServiceTask",
  exclusiveGateway: "bpmn:ExclusiveGateway",
  parallelGateway: "bpmn:ParallelGateway",
};