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
  | "intermediateCatch";

/** Event definition attached to start or intermediateCatch events. */
export type EventDefinition = "timer" | "message";

export interface INode {
  id: string;
  type: NodeType;
  name?: string;

  /** Lane assignment (within the node's process). */
  laneId?: string;

  /** For `start` / `intermediateCatch` — timer or message catch. */
  eventDefinition?: EventDefinition;

  /**
   * Multi-instance loop characteristics.
   * `true` → parallel MI; `{ sequential: true }` → sequential MI.
   */
  multiInstance?: boolean | { sequential?: boolean };

  /** Data store ids this node writes to (dataOutputAssociation). */
  dataOutputs?: string[];

  /** Data store ids this node reads from (dataInputAssociation). */
  dataInputs?: string[];
}
