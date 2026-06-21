interface ILane {
    id: string;
    name: string;
    nodeIds: string[];
}

type NodeType = "start" | "end" | "userTask" | "serviceTask" | "exclusiveGateway" | "parallelGateway";
interface INode {
    id: string;
    type: NodeType;
    name?: string;
}

interface IEdge {
    id?: string;
    source: string;
    target: string;
    name?: string;
}

interface ProcessModel {
    id: string;
    name?: string;
    lanes?: ILane[];
    nodes: INode[];
    edges: IEdge[];
}

declare function convert(model: ProcessModel): Promise<string>;

export { type ProcessModel, convert };
