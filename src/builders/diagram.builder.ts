import type { BPMNModdle } from "bpmn-moddle";
import { layoutGraph } from "../elk.layout";
import type { FlowMeta } from "./flow.builder";
import type { INode } from "../types/node";
import type { ILane } from "../types/lane";

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
const NODE_IN_LANE_MARGIN_X = 40;
const NODE_IN_LANE_PADDING_Y = 40;
const DEFAULT_LANE_HEIGHT = 180;
const CONTENT_PADDING = 80;
const BACKWARD_EDGE_GAP = 40;

function getBounds(type: string) {
  if (type === "bpmn:StartEvent" || type === "bpmn:EndEvent") {
    return NODE_SIZE.start;
  }

  if (type.endsWith("Gateway")) {
    return NODE_SIZE.gateway;
  }

  return NODE_SIZE.default;
}

function center(b: Bounds): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function dedupePoints(points: Point[]): Point[] {
  return points.filter((point, index) => {
    if (index === 0) return true;
    const prev = points[index - 1]!;
    return (
      Math.abs(point.x - prev.x) > 0.5 || Math.abs(point.y - prev.y) > 0.5
    );
  });
}

/**
 * Build orthogonal (Manhattan) waypoints between two placed shapes.
 * Uses border attachment points so edges do not cut through nodes.
 */
function orthogonalWaypoints(source: Bounds, target: Bounds): Point[] {
  const sc = center(source);
  const tc = center(target);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;

  let from: Point;
  let to: Point;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      from = { x: source.x + source.width, y: sc.y };
      to = { x: target.x, y: tc.y };
    } else {
      from = { x: source.x, y: sc.y };
      to = { x: target.x + target.width, y: tc.y };
    }
  } else if (dy >= 0) {
    from = { x: sc.x, y: source.y + source.height };
    to = { x: tc.x, y: target.y };
  } else {
    from = { x: sc.x, y: source.y };
    to = { x: tc.x, y: target.y + target.height };
  }

  // Same row / column — straight segment.
  if (Math.abs(from.y - to.y) < 1) {
    return dedupePoints([from, { x: to.x, y: from.y }]);
  }
  if (Math.abs(from.x - to.x) < 1) {
    return dedupePoints([from, { x: from.x, y: to.y }]);
  }

  // Forward (left → right): mid-X elbow.
  if (to.x >= from.x) {
    const midX = Math.round((from.x + to.x) / 2);
    return dedupePoints([
      from,
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      to,
    ]);
  }

  // Backward / loop: route below or above to avoid crossing mid-nodes.
  const goBelow = dy >= 0;
  const bypassY = goBelow
    ? Math.max(from.y, to.y) + BACKWARD_EDGE_GAP
    : Math.min(from.y, to.y) - BACKWARD_EDGE_GAP;

  // Prefer leaving vertically when source is to the right of target.
  const leave: Point =
    Math.abs(dx) >= Math.abs(dy)
      ? { x: from.x, y: bypassY }
      : from.y === source.y || from.y === source.y + source.height
        ? { x: from.x, y: bypassY }
        : { x: from.x, y: bypassY };

  return dedupePoints([
    from,
    leave,
    { x: to.x, y: leave.y },
    to,
  ]);
}

/**
 * Orthogonal waypoints from ELK edge geometry (no-lane mode).
 */
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

    const flowById = new Map(flows.map((f) => [f.id, f]));
    const edgesDi = (layout.edges ?? [])
      .map((edge: any) => {
        const meta =
          flowById.get(String(edge.id)) ??
          flows.find(
            (f) =>
              f.source === String(edge.sources?.[0]) &&
              f.target === String(edge.targets?.[0]),
          );
        if (!meta?.flow) return null;

        const section = edge.sections?.[0];
        let points =
          section && elkWaypoints(section).length >= 2
            ? elkWaypoints(section)
            : null;

        if (!points) {
          const source = positionByNodeId.get(meta.source);
          const target = positionByNodeId.get(meta.target);
          if (!source || !target) return null;
          points = orthogonalWaypoints(source, target);
        }

        if (points.length < 2) return null;

        return this.moddle.create("bpmndi:BPMNEdge", {
          id: `${meta.id}_di`,
          bpmnElement: meta.flow,
          waypoint: points.map((point) =>
            this.moddle.create("dc:Point", point),
          ),
        });
      })
      .filter(Boolean);

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

    // Uniform lane height: tall enough for the tallest node + padding.
    // Nodes are vertically centered — keeps cross-lane edges clean.
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
      POOL_OFFSET_X + POOL_HEADER_WIDTH + LANE_HEADER_WIDTH + NODE_IN_LANE_MARGIN_X;

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

    // Lanes are inset by POOL_HEADER_WIDTH so pool title and lane titles
    // do not occupy the same vertical strip (bpmn.io / Camunda convention).
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

    const edgesDi = flows
      .map((meta) => {
        const source = positionByNodeId.get(meta.source);
        const target = positionByNodeId.get(meta.target);
        if (!source || !target || !meta.flow) return null;

        const points = orthogonalWaypoints(source, target);
        if (points.length < 2) return null;

        return this.moddle.create("bpmndi:BPMNEdge", {
          id: `${meta.id}_di`,
          bpmnElement: meta.flow,
          waypoint: points.map((point) =>
            this.moddle.create("dc:Point", {
              x: Math.round(point.x),
              y: Math.round(point.y),
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
        ...edgesDi,
      ],
    });

    return this.moddle.create("bpmndi:BPMNDiagram", {
      id: "BPMNDiagram_1",
      plane,
    });
  }
}
