import type { BPMNModdle } from "bpmn-moddle";
import { layoutGraph } from "../elk.layout";
import type { FlowMeta } from "./flow.builder";
import type { INode } from "../types/node";
import type { ILane } from "../types/lane";
import {
  dedupePoints,
  routeOrthogonalEdges,
} from "../utils/edge-router";

type Bounds = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

const NODE_SIZE = {
  default: { width: 100, height: 80 },
  start: { width: 36, height: 36 },
  end: { width: 36, height: 36 },
  gateway: { width: 50, height: 50 },
};

/** Left strip for pool (participant) title — lanes must start after this. */
const POOL_HEADER_WIDTH = 30;
/** Left strip inside each lane for lane title. */
const LANE_HEADER_WIDTH = 30;

const POOL_OFFSET_X = 160;
const POOL_OFFSET_Y = 80;
const NODE_IN_LANE_MARGIN_X = 50;
const NODE_IN_LANE_PADDING_Y = 50;
const DEFAULT_LANE_HEIGHT = 200;
const CONTENT_PADDING = 80;

function getBounds(type: string) {
  if (type === "bpmn:StartEvent" || type === "bpmn:EndEvent") {
    return NODE_SIZE.start;
  }

  if (type.endsWith("Gateway")) {
    return NODE_SIZE.gateway;
  }

  return NODE_SIZE.default;
}

function elkWaypoints(section: any): Point[] {
  const raw = [
    section.startPoint,
    ...(section.bendPoints ?? []),
    section.endPoint,
  ]
    .filter(
      (point: any) =>
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

  return dedupePoints(raw);
}

export class DiagramBuilder {
  constructor(private moddle: BPMNModdle) {}

  async build(options: {
    process: any;
    collaboration?: any | null;
    elements: any[];
    flows: FlowMeta[];
    laneElements: any[];
    sourceLanes: ILane[];
    sourceNodes: INode[];
  }) {
    const {
      process,
      collaboration,
      elements,
      flows,
      laneElements,
      sourceLanes,
      sourceNodes,
    } = options;

    const hasLanes = sourceLanes.length > 0 && laneElements.length > 0;

    const nodes = elements.map((el) => {
      const bounds = getBounds(el.$type);
      return {
        id: String(el.id),
        width: bounds.width,
        height: bounds.height,
      };
    });

    const edges = flows.map((flow) => ({
      id: String(flow.id),
      source: String(flow.source),
      target: String(flow.target),
    }));

    const layout = await layoutGraph(nodes, edges);

    const nodeMap = new Map<string, any>();
    for (const child of layout.children ?? []) {
      if (child?.id) nodeMap.set(String(child.id), child);
    }

    if (!hasLanes) {
      return this.buildWithoutLanes(process, elements, flows, nodeMap, layout);
    }

    return this.buildWithLanes({
      collaboration,
      elements,
      flows,
      laneElements,
      sourceLanes,
      sourceNodes,
      nodeMap,
    });
  }

  private createEdgeElements(
    flows: FlowMeta[],
    waypointsById: Map<string, Point[]>,
  ) {
    return flows
      .map((meta) => {
        const points = waypointsById.get(meta.id);
        if (!points || points.length < 2 || !meta.flow) return null;

        return this.moddle.create("bpmndi:BPMNEdge", {
          id: `${meta.id}_di`,
          bpmnElement: meta.flow,
          waypoint: points.map((point) =>
            this.moddle.create("dc:Point", {
              x: point.x,
              y: point.y,
            }),
          ),
        });
      })
      .filter(Boolean);
  }

  private buildWithoutLanes(
    process: any,
    elements: any[],
    flows: FlowMeta[],
    nodeMap: Map<string, any>,
    layout: any,
  ) {
    const positionByNodeId = new Map<string, Bounds>();

    const shapes = elements
      .map((element) => {
        const pos = nodeMap.get(String(element.id));
        if (!pos) return null;

        const bounds: Bounds = {
          x: Number(pos.x ?? 0),
          y: Number(pos.y ?? 0),
          width: Number(pos.width ?? NODE_SIZE.default.width),
          height: Number(pos.height ?? NODE_SIZE.default.height),
        };
        positionByNodeId.set(String(element.id), bounds);

        return this.moddle.create("bpmndi:BPMNShape", {
          id: `${element.id}_di`,
          bpmnElement: element,
          bounds: this.moddle.create("dc:Bounds", bounds),
        });
      })
      .filter(Boolean);

    // Prefer orthogonal router; fall back to ELK geometry if needed.
    const routed = routeOrthogonalEdges(
      flows.map((f) => ({
        id: f.id,
        sourceId: f.source,
        targetId: f.target,
      })),
      positionByNodeId,
    );

    for (const edge of layout.edges ?? []) {
      const id = String(edge.id);
      if (routed.has(id)) continue;
      const section = edge.sections?.[0];
      if (!section) continue;
      const points = elkWaypoints(section);
      if (points.length >= 2) routed.set(id, points);
    }

    const edgesDi = this.createEdgeElements(flows, routed);

    const plane = this.moddle.create("bpmndi:BPMNPlane", {
      id: "BPMNPlane_1",
      bpmnElement: process,
      planeElement: [...shapes, ...edgesDi],
    });

    return this.moddle.create("bpmndi:BPMNDiagram", {
      id: "BPMNDiagram_1",
      plane,
    });
  }

  private buildWithLanes(args: {
    collaboration: any;
    elements: any[];
    flows: FlowMeta[];
    laneElements: any[];
    sourceLanes: ILane[];
    sourceNodes: INode[];
    nodeMap: Map<string, any>;
  }) {
    const {
      collaboration,
      elements,
      flows,
      laneElements,
      sourceLanes,
      sourceNodes,
      nodeMap,
    } = args;

    const laneIndexById = new Map(
      sourceLanes.map((lane, index) => [lane.id, index]),
    );

    let maxNodeHeight = NODE_SIZE.default.height;
    for (const child of nodeMap.values()) {
      maxNodeHeight = Math.max(
        maxNodeHeight,
        Number(child.height ?? NODE_SIZE.default.height),
      );
    }

    const laneHeight = Math.max(
      DEFAULT_LANE_HEIGHT,
      maxNodeHeight + NODE_IN_LANE_PADDING_Y * 2,
    );
    const laneHeights = sourceLanes.map(() => laneHeight);
    const laneOffsets = laneHeights.reduce<number[]>((offsets, _, index) => {
      offsets[index] =
        index === 0 ? 0 : offsets[index - 1]! + laneHeights[index - 1]!;
      return offsets;
    }, []);

    const contentOriginX =
      POOL_OFFSET_X +
      POOL_HEADER_WIDTH +
      LANE_HEADER_WIDTH +
      NODE_IN_LANE_MARGIN_X;

    const positionByNodeId = new Map<string, Bounds>();

    for (const element of elements) {
      const pos = nodeMap.get(String(element.id));
      if (!pos) continue;

      const sourceNode = sourceNodes.find((n) => n.id === element.id);
      const laneId = sourceNode?.laneId ?? sourceLanes[0]?.id ?? "";
      const laneIndex = laneIndexById.get(laneId) ?? 0;
      const width = Number(pos.width ?? NODE_SIZE.default.width);
      const height = Number(pos.height ?? NODE_SIZE.default.height);
      const laneTop = POOL_OFFSET_Y + (laneOffsets[laneIndex] ?? 0);

      positionByNodeId.set(String(element.id), {
        x: contentOriginX + Number(pos.x ?? 0),
        y: laneTop + (laneHeight - height) / 2,
        width,
        height,
      });
    }

    const shapes = elements
      .map((element) => {
        const pos = positionByNodeId.get(String(element.id));
        if (!pos) return null;

        return this.moddle.create("bpmndi:BPMNShape", {
          id: `${element.id}_di`,
          bpmnElement: element,
          bounds: this.moddle.create("dc:Bounds", pos),
        });
      })
      .filter(Boolean);

    let maxRight = POOL_OFFSET_X + 600;
    for (const pos of positionByNodeId.values()) {
      maxRight = Math.max(maxRight, pos.x + pos.width + CONTENT_PADDING);
    }

    const poolWidth = maxRight - POOL_OFFSET_X;
    const totalLaneHeight = laneHeight * sourceLanes.length;

    const participant = collaboration?.participants?.[0];
    const participantShape = participant
      ? this.moddle.create("bpmndi:BPMNShape", {
          id: `${participant.id}_di`,
          bpmnElement: participant,
          isHorizontal: true,
          bounds: this.moddle.create("dc:Bounds", {
            x: POOL_OFFSET_X,
            y: POOL_OFFSET_Y,
            width: poolWidth,
            height: totalLaneHeight,
          }),
        })
      : null;

    const laneShapes = laneElements.map((lane, index) =>
      this.moddle.create("bpmndi:BPMNShape", {
        id: `${lane.id}_di`,
        bpmnElement: lane,
        isHorizontal: true,
        bounds: this.moddle.create("dc:Bounds", {
          x: POOL_OFFSET_X + POOL_HEADER_WIDTH,
          y: POOL_OFFSET_Y + (laneOffsets[index] ?? 0),
          width: poolWidth - POOL_HEADER_WIDTH,
          height: laneHeights[index] ?? laneHeight,
        }),
      }),
    );

    const waypointsById = routeOrthogonalEdges(
      flows.map((f) => ({
        id: f.id,
        sourceId: f.source,
        targetId: f.target,
      })),
      positionByNodeId,
    );

    const edgesDi = this.createEdgeElements(flows, waypointsById);

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
