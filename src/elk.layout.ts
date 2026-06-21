import ELK from "elkjs";

const elk = new ELK();

export async function layoutGraph(nodes: any[], edges: any[]) {
  const graph = {
    id: "root",

    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",

      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.nodeNode": "80",

      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },

    children: nodes.map((n) => ({
      id: n.id,
      width: n.width ?? 120,
      height: n.height ?? 80,
    })),

    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],

      junctionPoints: [],
    })),
  };

  return await elk.layout(graph);
}