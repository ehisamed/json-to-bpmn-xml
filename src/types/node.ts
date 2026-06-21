export type NodeType =
  | "start"
  | "end"
  | "userTask"
  | "serviceTask"
  | "exclusiveGateway"
  | "parallelGateway";

export interface INode {
  id: string;
  type: NodeType;

  name?: string;
}
