import type { DiColor } from "./di-color";

export type NodeType =
  | "start"
  | "end"
  | "task"
  | "userTask"
  | "serviceTask"
  | "subProcess"
  | "exclusiveGateway"
  | "parallelGateway"
  | "eventBasedGateway"
  | "intermediateCatch"
  | "boundaryEvent";

/** Event definition attached to start, intermediateCatch, or boundary events. */
export type EventDefinition = "timer" | "message";

export interface INode {
  id: string;
  type: NodeType;
  name?: string;

  /** Lane assignment (within the node's process). */
  laneId?: string;

  /** For `start` / `intermediateCatch` — timer or message catch. */
  eventDefinition?: EventDefinition;

  /** Activity id that owns a `boundaryEvent`. Required for boundary events. */
  attachedTo?: string;

  /**
   * Multi-instance loop characteristics.
   * `true` → parallel MI; `{ sequential: true }` → sequential MI.
   */
  multiInstance?: boolean | { sequential?: boolean };

  /** Data store ids this node writes to (dataOutputAssociation). */
  dataOutputs?: string[];

  /** Data store ids this node reads from (dataInputAssociation). */
  dataInputs?: string[];

  /** Optional DI fill/stroke (bpmn.io bioc + color extensions). */
  color?: DiColor;
}
