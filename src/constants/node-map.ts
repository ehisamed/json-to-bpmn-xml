import { NodeType } from "../types/node";

export const NODE_MAP: Record<NodeType, string> = {
  start: "bpmn:StartEvent",
  end: "bpmn:EndEvent",
  task: "bpmn:Task",
  userTask: "bpmn:UserTask",
  serviceTask: "bpmn:ServiceTask",
  subProcess: "bpmn:SubProcess",
  exclusiveGateway: "bpmn:ExclusiveGateway",
  inclusiveGateway: "bpmn:InclusiveGateway",
  parallelGateway: "bpmn:ParallelGateway",
  eventBasedGateway: "bpmn:EventBasedGateway",
  intermediateCatch: "bpmn:IntermediateCatchEvent",
  boundaryEvent: "bpmn:BoundaryEvent",
};
