import ELK from "elkjs";

const elk = new ELK();

export async function layoutGraph(lanes: any[], edges: any[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
    },

    children: lanes.map((lane) => ({
      id: lane.id,
      layoutOptions: {
        "elk.direction": "RIGHT",
        "elk.padding": "[top=40,left=40,bottom=40,right=40]",
      },

      // 🔥 FIX: ALWAYS SAFE ARRAY
      children: (lane.nodes ?? []).map((n: any) => ({
        id: n.id,
        width: n.width,
        height: n.height,
      })),

      // optional edges inside lane (ELK can ignore cross-lane)
      edges: [],
    })),

    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  return elk.layout(graph);
}