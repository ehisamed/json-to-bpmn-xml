import type { BPMNModdle } from "bpmn-moddle";
import { layoutGraph } from "../elk.layout";
import type { FlowMeta } from "./flow.builder";

const NODE_SIZE = {
  default: { width: 100, height: 80 },
  start: { width: 36, height: 36 },
  end: { width: 36, height: 36 },
  gateway: { width: 50, height: 50 },
};

function getBounds(type: string) {
  if (type === "bpmn:StartEvent" || type === "bpmn:EndEvent") {
    return NODE_SIZE.start;
  }

  if (type.endsWith("Gateway")) {
    return NODE_SIZE.gateway;
  }

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
  ) {
    const nodes = elements.map((el) => {
      const bounds = getBounds(el.$type);

      return {
        id: String(el.id),
        width: bounds.width,
        height: bounds.height,
        bpmnElement: el,
      };
    });

    const edges = flows.map((flow) => ({
      id: String(flow.id),
      source: String(flow.source),
      target: String(flow.target),
      flow: flow.flow,
    }));

    const layout = await layoutGraph(
      nodes,
      edges,
    );

    const nodeMap = new Map(
      (layout.children ?? [])
        .filter((n: any) => n && n.id)
        .map((n: any) => [String(n.id), n]),
    );

    const shapes = elements
      .map((element) => {
        const pos = nodeMap.get(String(element.id));
        if (!pos) return null;

        const bounds = {
          x: Number(pos.x ?? 0),
          y: Number(pos.y ?? 0),
          width: Number(pos.width ?? NODE_SIZE.default.width),
          height: Number(pos.height ?? NODE_SIZE.default.height),
        };

        return this.moddle.create("bpmndi:BPMNShape", {
          id: `${element.id}_di`,
          bpmnElement: element,
          bounds: this.moddle.create("dc:Bounds", bounds),
        });
      })
      .filter(Boolean);

    const participant = collaboration.participants?.[0];

    const participantShape = participant
      ? this.moddle.create("bpmndi:BPMNShape", {
          id: `${participant.id}_di`,
          bpmnElement: participant,
          isHorizontal: true,
          bounds: this.moddle.create("dc:Bounds", {
            x: 150,
            y: 80,
            width: 1000,
            height: 380,
          }),
        })
      : null;

    const laneShapes = (lanes ?? [])
      .map((lane: any) => {
        const laneNodePositions = lane.nodeIds
          .map((nodeId: string) => nodeMap.get(String(nodeId)))
          .filter(Boolean);

        if (laneNodePositions.length === 0) return null;

        const minX = Math.min(
          ...laneNodePositions.map((pos: any) => Number(pos.x ?? 0)),
        );
        const minY = Math.min(
          ...laneNodePositions.map((pos: any) => Number(pos.y ?? 0)),
        );
        const maxX = Math.max(
          ...laneNodePositions.map(
            (pos: any) =>
              Number(pos.x ?? 0) + Number(pos.width ?? NODE_SIZE.default.width),
          ),
        );
        const maxY = Math.max(
          ...laneNodePositions.map(
            (pos: any) =>
              Number(pos.y ?? 0) +
              Number(pos.height ?? NODE_SIZE.default.height),
          ),
        );

        const padding = 20;

        return this.moddle.create("bpmndi:BPMNShape", {
          id: `${lane.id}_di`,
          bpmnElement: lane,
          isHorizontal: true,
          bounds: this.moddle.create("dc:Bounds", {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2,
          }),
        });
      })
      .filter(Boolean);

    const flowById = new Map(edges.map((f) => [String(f.id), f.flow]));

    const edgeWaypoints = (layout.edges ?? [])
      .map((edge: any) => {
        if (!edge || !edge.id) return null;

        const section = edge.sections?.[0];
        if (!section) return null;

        const points = [
          section.startPoint,
          ...(section.bendPoints ?? []),
          section.endPoint,
        ]
          .filter(
            (point) =>
              point &&
              point.x !== undefined &&
              point.y !== undefined &&
              !Number.isNaN(Number(point.x)) &&
              !Number.isNaN(Number(point.y)),
          )
          .map((point: any) => ({
            x: Number(point.x),
            y: Number(point.y),
          }));

        if (points.length < 2) return null;

        const flow =
          flowById.get(String(edge.id)) ??
          edges.find(
            (f) =>
              String(f.source) === String(edge.sources?.[0]) &&
              String(f.target) === String(edge.targets?.[0]),
          )?.flow;

        if (!flow) return null;

        return this.moddle.create("bpmndi:BPMNEdge", {
          id: `${edge.id}_di`,
          bpmnElement: flow,
          waypoint: points.map((point) =>
            this.moddle.create("dc:Point", {
              x: point.x,
              y: point.y,
            }),
          ),
        });
      })
      .filter(Boolean);

    const plane = this.moddle.create("bpmndi:BPMNPlane", {
      id: "BPMNPlane_1",
      bpmnElement: collaboration,
      planeElement: [
        ...(participantShape ? [participantShape] : []),
        ...laneShapes,
        ...shapes,
        ...edgeWaypoints,
      ],
    });

    return this.moddle.create("bpmndi:BPMNDiagram", {
      id: "BPMNDiagram_1",
      plane,
    });
  }
}
