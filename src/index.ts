import { BpmnConverter } from "./converter/BpmnConverter";
import type { ProcessModel, IProcessDef } from "./types/process";
import type {
  INode,
  ISubProcessDef,
  NodeType,
  EventDefinition,
} from "./types/node";
import type { IEdge } from "./types/edge";
import type { ILane } from "./types/lane";
import type { IMessageFlow } from "./types/message-flow";
import type { IDataStore } from "./types/data-store";
import type { IDataObject } from "./types/data-object";
import type { ITextAnnotation, IGroup, IAssociation } from "./types/artifact";
import type { DiColor } from "./types/di-color";

export async function convert(model: ProcessModel): Promise<string> {
  const converter = new BpmnConverter();
  return await converter.convert(model);
}

export { BpmnConverter };
export type {
  ProcessModel,
  IProcessDef,
  INode,
  IEdge,
  ILane,
  IMessageFlow,
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
