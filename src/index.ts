import { BpmnConverter } from "./converter/BpmnConverter";
import { BpmnImporter } from "./converter/BpmnImporter";
import type { ImportResult, ImportWarning } from "./converter/BpmnImporter";
import type { ProcessModel, IProcessDef } from "./types/process";
import type {
  INode,
  ISubProcessDef,
  NodeType,
  EventDefinition,
  EventDefinitionOptions,
} from "./types/node";
import type { IEdge } from "./types/edge";
import type { ILane } from "./types/lane";
import type { IMessageFlow } from "./types/message-flow";
import type { IMessage } from "./types/message";
import type { ISignal } from "./types/signal";
import type { IBpmnError } from "./types/error";
import type { IBpmnEscalation } from "./types/escalation";
import type { IDataStore } from "./types/data-store";
import type { IDataObject } from "./types/data-object";
import type { ITextAnnotation, IGroup, IAssociation } from "./types/artifact";
import type { DiColor } from "./types/di-color";

export async function convert(model: ProcessModel): Promise<string> {
  const converter = new BpmnConverter();
  return await converter.convert(model);
}

/** Parse BPMN XML into the supported JSON subset and report omitted BPMN content. */
export async function importBpmn(xml: string): Promise<ImportResult> {
  return new BpmnImporter().import(xml);
}

export { BpmnConverter, BpmnImporter };
export type {
  ImportResult,
  ImportWarning,
  ProcessModel,
  IProcessDef,
  INode,
  IEdge,
  ILane,
  IMessageFlow,
  IMessage,
  ISignal,
  IBpmnError,
  IBpmnEscalation,
  IDataStore,
  IDataObject,
  ITextAnnotation,
  IGroup,
  IAssociation,
  DiColor,
  NodeType,
  EventDefinition,
  ISubProcessDef,
};
