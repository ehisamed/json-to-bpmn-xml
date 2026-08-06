import { BpmnConverter } from "./converter/BpmnConverter";
import type { ProcessModel, IProcessDef } from "./types/process";
import type { INode, NodeType, EventDefinition } from "./types/node";
import type { IEdge } from "./types/edge";
import type { ILane } from "./types/lane";
import type { IMessageFlow } from "./types/message-flow";
import type { IDataStore } from "./types/data-store";

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
  NodeType,
  EventDefinition,
};
