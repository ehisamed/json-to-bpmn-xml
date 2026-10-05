import type { DiColor } from "./di-color";
import type { IEdge } from "./edge";

export type NodeType =
  | "start"
  | "end"
  | "task"
  | "manualTask"
  | "userTask"
  | "serviceTask"
  | "sendTask"
  | "receiveTask"
  | "scriptTask"
  | "businessRuleTask"
  | "callActivity"
  | "subProcess"
  | "exclusiveGateway"
  | "inclusiveGateway"
  | "parallelGateway"
  | "eventBasedGateway"
  | "intermediateCatch"
  | "boundaryEvent";

/** Event definition attached to supported BPMN events. */
export type EventDefinition =
  | "timer"
  | "message"
  | "signal"
  | "conditional"
  | "error"
  | "escalation"
  | "terminate"
  | "cancel"
  | "compensation"
  | "link";

export interface ISubProcessDef {
  nodes: INode[];
  edges: IEdge[];
  /** Render the embedded body inside the subprocess shape when true. */
  expanded?: boolean;
  /** BPMN subprocess specialization. `event` emits triggeredByEvent; `transaction` emits bpmn:Transaction. */
  subProcessType?: "event" | "transaction";
}

export interface INode {
  id: string;
  type: NodeType;
  name?: string;

  /** Lane assignment (within the node's process). */
  laneId?: string;

  /** For `start` / `intermediateCatch` — timer or message catch. */
  eventDefinition?: EventDefinition;

  /** Multiple event definitions on one event, such as timer OR message. */
  eventDefinitions?: EventDefinition[];

  /** Activity id that owns a `boundaryEvent`. Required for boundary events. */
  attachedTo?: string;

  /** Embedded subprocess body. Supported only when `type` is `subProcess`. */
  subProcess?: ISubProcessDef;

  /** External process reference for `callActivity`. */
  calledElement?: string;

  /** BPMN implementation value for send/receive/service activities. */
  implementation?: string;

  /** Script body and language for `scriptTask`. */
  script?: string;
  scriptFormat?: string;

  /**
   * Multi-instance loop characteristics.
   * `true` → parallel MI; `{ sequential: true }` → sequential MI.
   */
  multiInstance?: boolean | { sequential?: boolean };

  /** Data store ids this node writes to (dataOutputAssociation). */
  dataOutputs?: string[];

  /** Data store ids this node reads from (dataInputAssociation). */
  dataInputs?: string[];

  /** Data object ids this node writes to (dataOutputAssociation). */
  dataObjectOutputs?: string[];

  /** Data object ids this node reads from (dataInputAssociation). */
  dataObjectInputs?: string[];

  /** Optional DI fill/stroke (bpmn.io bioc + color extensions). */
  color?: DiColor;
}
