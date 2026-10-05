import { ILane } from "./lane";
import { INode } from "./node";
import { IEdge } from "./edge";
import { IMessageFlow } from "./message-flow";
import { IDataStore } from "./data-store";
import { IDataObject } from "./data-object";

/** One process (pool participant) inside a collaboration. */
export interface IProcessDef {
  id: string;
  name?: string;
  /** Optional explicit participant id (defaults to `Participant_${id}`). */
  participantId?: string;
  /** Pool title; defaults to process name. */
  participantName?: string;
  lanes?: ILane[];
  nodes: INode[];
  edges: IEdge[];
}

/**
 * Input model for JSON → BPMN conversion.
 *
 * Simple (single process) — use top-level `nodes` / `edges` / `lanes`.
 * Collaboration — use `processes` (+ optional `messageFlows`, `dataStores`).
 */
export interface ProcessModel {
  id: string;
  name?: string;

  /** Simple mode: single process body. */
  lanes?: ILane[];
  nodes?: INode[];
  edges?: IEdge[];

  /** Collaboration mode: one or more processes (pools). */
  processes?: IProcessDef[];

  /** Message flows between elements in different processes. */
  messageFlows?: IMessageFlow[];

  /** Shared data store references. */
  dataStores?: IDataStore[];
  /** Data object references shared by process activities. */
  dataObjects?: IDataObject[];
}
