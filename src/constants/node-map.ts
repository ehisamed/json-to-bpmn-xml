import { NodeType } from "../types/node";

export const NODE_MAP: Record<NodeType, string> = {
  start: "bpmn:StartEvent",
  end: "bpmn:EndEvent",
  task: "bpmn:Task",
  manualTask: "bpmn:ManualTask",
  userTask: "bpmn:UserTask",
  serviceTask: "bpmn:ServiceTask",
  sendTask: "bpmn:SendTask",
  receiveTask: "bpmn:ReceiveTask",
  scriptTask: "bpmn:ScriptTask",
  businessRuleTask: "bpmn:BusinessRuleTask",
  callActivity: "bpmn:CallActivity",
  subProcess: "bpmn:SubProcess",
  exclusiveGateway: "bpmn:ExclusiveGateway",
  inclusiveGateway: "bpmn:InclusiveGateway",
  parallelGateway: "bpmn:ParallelGateway",
  eventBasedGateway: "bpmn:EventBasedGateway",
  intermediateCatch: "bpmn:IntermediateCatchEvent",
  boundaryEvent: "bpmn:BoundaryEvent",
};
