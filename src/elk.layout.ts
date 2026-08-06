import ELK from "elkjs";

const elk = new ELK();

export async function layoutGraph(nodes: any[], edges: any[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "110",
      "elk.layered.spacing.edgeNodeBetweenLayers": "40",
      "elk.spacing.edgeNode": "30",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
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
