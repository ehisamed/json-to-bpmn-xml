import { BpmnConverter } from "./converter/BpmnConverter";
import type { ProcessModel } from "./types/process";
import type { INode, NodeType } from "./types/node";
import type { IEdge } from "./types/edge";
import type { ILane } from "./types/lane";

export async function convert(model: ProcessModel): Promise<string> {
  const converter = new BpmnConverter();
  return await converter.convert(model);
}

export { BpmnConverter };
export type { ProcessModel, INode, IEdge, ILane, NodeType };
