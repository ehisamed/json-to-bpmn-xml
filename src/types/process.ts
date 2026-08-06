import { ILane } from "./lane";
import { INode } from "./node";
import { IEdge } from "./edge";

export interface ProcessModel {
  id: string;
  name?: string;

  lanes?: ILane[];
  nodes: INode[];
  edges: IEdge[];
}
