import ELK from "elkjs";

const elk = new ELK();

export async function layoutGraph(nodes: any[], edges: any[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.edgeRouting": "ORTHOGONAL",
    },

    children: nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
    })),

    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  return elk.layout(graph);
}
