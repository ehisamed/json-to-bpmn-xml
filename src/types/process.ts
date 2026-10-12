import { ILane } from "./lane";
import { INode } from "./node";
import { IEdge } from "./edge";
import { IMessageFlow } from "./message-flow";
import { IDataStore } from "./data-store";
import { IDataObject } from "./data-object";
import { ITextAnnotation, IGroup, IAssociation } from "./artifact";
import { IMessage } from "./message";
import { ISignal } from "./signal";
import { IBpmnError } from "./error";
import { IBpmnEscalation } from "./escalation";

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

  /** Reusable message definitions referenced by nodes and event definitions. */
  messages?: IMessage[];

  /** Reusable signal definitions referenced by signal event definitions. */
  signals?: ISignal[];

  /** Reusable error definitions referenced by error events. */
  errors?: IBpmnError[];

  /** Reusable escalation definitions referenced by escalation events. */
  escalations?: IBpmnEscalation[];

  /** Shared data store references. */
  dataStores?: IDataStore[];
  /** Data object references shared by process activities. */
  dataObjects?: IDataObject[];
  /** BPMN artifacts and associations attached to the process diagram. */
  textAnnotations?: ITextAnnotation[];
  groups?: IGroup[];
  associations?: IAssociation[];
}
