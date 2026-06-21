import { ILane } from "./lane";
import { INode } from "./Node";
import { IEdge } from "./edge";

export interface ProcessModel {
  id: string;
  name?: string;

  lanes?: ILane[];
  nodes: INode[];
  edges: IEdge[];
}
