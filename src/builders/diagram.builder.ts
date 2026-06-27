import type { BPMNModdle } from "bpmn-moddle";
import { layoutGraph } from "../elk.layout";
import type { FlowMeta } from "./flow.builder";

const NODE_INSIDE_LANE_MARGIN = 40;

const NODE_SIZE = {
  default: { width: 100, height: 80 },
  start: { width: 36, height: 36 },
  end: { width: 36, height: 36 },
  gateway: { width: 50, height: 50 },
};

function getBounds(type: string) {
  if (type === "bpmn:StartEvent" || type === "bpmn:EndEvent")
    return NODE_SIZE.start;
  if (type.endsWith("Gateway")) return NODE_SIZE.gateway;
  return NODE_SIZE.default;
}

export class DiagramBuilder {
  constructor(private moddle: BPMNModdle) {}

  async build(
    collaboration: any,
    process: any,
    elements: any[],
    flows: FlowMeta[],
    lanes: any[],
    sourceNodes: any[],
  ) {
    const OFFSET_X = 150;
    const OFFSET_Y = 120;

    // =========================
    // 1. ELK INPUT (ONLY NODES)
    // =========================
    const nodes = elements.map((el) => {
      const b = getBounds(el.$type);
      return {
        id: el.id,
        width: b.width,
        height: b.height,
      };
    });

    const edges = flows.map((f) => ({
      id: f.id,
      source: f.source,
      target: f.target,
    }));

    const layout = await layoutGraph(nodes, edges);

    const nodeMap = new Map<string, any>();

    const walk = (n: any) => {
      if (!n) return;
      if (n.children) n.children.forEach(walk);
      if (n.id) nodeMap.set(String(n.id), n);
    };

    walk(layout);

    // =========================
    // 2. NODES SHAPES
    // =========================

    const laneHeight = 200;

    const laneIndexById = new Map(
      lanes.map((lane: any, index: number) => [lane.id, index]),
    );

    const laneOffsetByNodeId = new Map(
      sourceNodes.map((node) => [
        node.id,
        (laneIndexById.get(node.laneId ?? "") ?? 0) * laneHeight,
      ]),
    );

    const shapes = elements
      .map((el) => {
        const pos = nodeMap.get(el.id);
        if (!pos) return null;

        const laneOffset = laneOffsetByNodeId.get(el.id) ?? 0;

        return this.moddle.create("bpmndi:BPMNShape", {
          id: `${el.id}_di`,
          bpmnElement: el,
          bounds: this.moddle.create("dc:Bounds", {
            x: pos.x + OFFSET_X + NODE_INSIDE_LANE_MARGIN,
            y: pos.y + OFFSET_Y + laneOffset + NODE_INSIDE_LANE_MARGIN,
            width: pos.width,
            height: pos.height,
          }),
        });
      })
      .filter(Boolean);

    // =========================
    // 3. PARTICIPANT (WRAPPER)
    // =========================
    const participant = collaboration.participants?.[0];

    const participantShape = participant
      ? this.moddle.create("bpmndi:BPMNShape", {
          id: `${participant.id}_di`,
          bpmnElement: participant,
          isHorizontal: true,
          bounds: this.moddle.create("dc:Bounds", {
            x: OFFSET_X,
            y: OFFSET_Y,
            width: 1200,
            height: 600,
          }),
        })
      : null;

    // =========================
    // 4. LANES (FIXED STACK — NO ELK LOGIC)
    // =========================

    const laneShapes = lanes.map((lane: any, index: number) => {
      return this.moddle.create("bpmndi:BPMNShape", {
        id: `${lane.id}_di`,
        bpmnElement: lane,
        isHorizontal: true,
        bounds: this.moddle.create("dc:Bounds", {
          x: OFFSET_X,
          y: OFFSET_Y + index * laneHeight,
          width: 1200,
          height: laneHeight,
        }),
      });
    });

    // =========================
    // 5. EDGES
    // =========================
    const flowById = new Map(flows.map((f) => [f.id, f.flow]));

    const edgesDi = (layout.edges ?? [])
      .map((edge: any) => {
        const s = edge.sections?.[0];
        if (!s) return null;

        const sourceOffset =
          laneOffsetByNodeId.get(edge.sources?.[0] ?? "") ?? 0;
        const targetOffset =
          laneOffsetByNodeId.get(edge.targets?.[0] ?? "") ?? 0;

        const points = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint]
          .filter(Boolean)
          .map((p: any, index: number, array: any[]) => {
            const offset =
              index === 0
                ? sourceOffset
                : index === array.length - 1
                  ? targetOffset
                  : sourceOffset;

            return {
              x: p.x + OFFSET_X + NODE_INSIDE_LANE_MARGIN,
              y: p.y + OFFSET_Y + offset + NODE_INSIDE_LANE_MARGIN,
            };
          });

        const flow =
          flowById.get(edge.id) ??
          flows.find(
            (f) =>
              f.source === edge.sources?.[0] && f.target === edge.targets?.[0],
          )?.flow;

        if (!flow) return null;

        return this.moddle.create("bpmndi:BPMNEdge", {
          id: `${edge.id}_di`,
          bpmnElement: flow,
          waypoint: points.map((p) => this.moddle.create("dc:Point", p)),
        });
      })
      .filter(Boolean);

    // =========================
    // 6. FINAL DIAGRAM
    // =========================
    const plane = this.moddle.create("bpmndi:BPMNPlane", {
      id: "BPMNPlane_1",
      bpmnElement: collaboration,
      planeElement: [
        ...(participantShape ? [participantShape] : []),
        ...laneShapes,
        ...shapes,
        ...edgesDi,
      ],
    });

    return this.moddle.create("bpmndi:BPMNDiagram", {
      id: "BPMNDiagram_1",
      plane,
    });
  }
}
