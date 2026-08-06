import type { BPMNModdle } from "bpmn-moddle";
import { layoutGraph } from "../elk.layout";
import type { FlowMeta } from "./flow.builder";
import type { INode } from "../types/node";
import type { ILane } from "../types/lane";
import { applyDiColor, type DiColor } from "../types/di-color";
import { dedupePoints, routeOrthogonalEdges } from "../utils/edge-router";

type Bounds = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

const NODE_SIZE = {
  default: { width: 100, height: 80 },
  event: { width: 36, height: 36 },
  gateway: { width: 50, height: 50 },
  dataStore: { width: 50, height: 50 },
};

const POOL_HEADER_WIDTH = 30;
const LANE_HEADER_WIDTH = 30;
const POOL_OFFSET_X = 160;
const POOL_OFFSET_Y = 80;
const POOL_GAP = 140;
const NODE_IN_LANE_MARGIN_X = 50;
const NODE_IN_LANE_PADDING_Y = 36;
const DEFAULT_LANE_HEIGHT = 160;
const DEFAULT_POOL_HEIGHT = 200;
const CONTENT_PADDING = 60;
const BRANCH_GAP = 24;
const COLUMN_X_TOLERANCE = 60;

function getBoundsForType(type: string): { width: number; height: number } {
  if (
    type === "bpmn:StartEvent" ||
    type === "bpmn:EndEvent" ||
    type === "bpmn:IntermediateCatchEvent"
  ) {
    return NODE_SIZE.event;
  }
  if (type.endsWith("Gateway")) return NODE_SIZE.gateway;
  if (type === "bpmn:DataStoreReference") return NODE_SIZE.dataStore;
  return NODE_SIZE.default;
}

export type ProcessDiagramInput = {
  process: any;
  participant: any;
  elements: any[];
  flows: FlowMeta[];
  laneElements: any[];
  sourceLanes: ILane[];
  sourceNodes: INode[];
  dataStoreElements?: any[];
};

export type MessageFlowMeta = {
  id: string;
  source: string;
  target: string;
  flow: any;
};

export type DataAssociationMeta = {
  id: string;
  association: any;
  fromId: string;
  toId: string;
};

export class DiagramBuilder {
  private colorsById = new Map<string, DiColor>();

  constructor(private moddle: BPMNModdle) {}

  async build(options: {
    collaboration: any | null;
    processes: ProcessDiagramInput[];
    messageFlows?: MessageFlowMeta[];
    dataAssociations?: DataAssociationMeta[];
    colorsById?: Map<string, DiColor>;
  }) {
    const {
      collaboration,
      processes,
      messageFlows = [],
      dataAssociations = [],
      colorsById,
    } = options;
    this.colorsById = colorsById ?? new Map();

    if (!collaboration && processes.length === 1) {
      const only = processes[0]!;
      if (!only.sourceLanes.length) {
        return this.buildFlatProcess(only);
      }
    }

    const positionByNodeId = new Map<string, Bounds>();
    const planeElements: any[] = [];
    const poolBottoms: number[] = [];
    let cursorY = POOL_OFFSET_Y;
    let maxRight = POOL_OFFSET_X + 600;

    // Collect data stores — place them in the inter-pool gap (not inside pools).
    const allStores: any[] = [];
    for (const input of processes) {
      for (const store of input.dataStoreElements ?? []) {
        allStores.push(store);
      }
    }

    for (const input of processes) {
      const laidOut = await this.layoutProcessBlock(input, cursorY, {
        includeStores: allStores.length === 0,
      });
      for (const [id, bounds] of laidOut.positions) {
        positionByNodeId.set(id, bounds);
      }
      planeElements.push(...laidOut.planeElements);
      maxRight = Math.max(maxRight, laidOut.maxRight);
      poolBottoms.push(laidOut.bottom);
      cursorY = laidOut.bottom + POOL_GAP;
    }

    if (allStores.length) {
      // Prefer X near nodes that reference stores (Submit / Select Due Invoices).
      const anchorIds = dataAssociations.flatMap((a) => [a.fromId, a.toId]);
      let storeBaseX = POOL_OFFSET_X + 280;
      for (const id of anchorIds) {
        const b = positionByNodeId.get(id);
        if (b && !allStores.some((s) => String(s.id) === id)) {
          storeBaseX = b.x + b.width / 2 - NODE_SIZE.dataStore.width / 2;
          break;
        }
      }

      const storeY =
        poolBottoms[0]! + (POOL_GAP - NODE_SIZE.dataStore.height) / 2;

      allStores.forEach((store, index) => {
        const bounds = {
          x: Math.round(storeBaseX + index * 120),
          y: Math.round(storeY),
          width: NODE_SIZE.dataStore.width,
          height: NODE_SIZE.dataStore.height,
        };
        positionByNodeId.set(String(store.id), bounds);
        planeElements.push(
          this.createShape(String(store.id), store, bounds),
        );
      });
    }

    // Data associations first, then message flows — separate routing policies.
    const storeIds = new Set(allStores.map((s) => String(s.id)));
    const obstacles = [...positionByNodeId.entries()]
      .filter(([id]) => storeIds.has(id))
      .map(([, b]) => b);

    const gapTop = poolBottoms[0] ?? cursorY;
    const gapBottom =
      processes.length > 1 ? gapTop + POOL_GAP : gapTop + POOL_GAP;

    dataAssociations.forEach((assoc, index) => {
      const edge = this.createBridgeEdge(
        assoc.id,
        assoc.association,
        assoc.fromId,
        assoc.toId,
        positionByNodeId,
        {
          kind: "data",
          slotIndex: index,
          slotCount: dataAssociations.length,
          obstacles,
          gapTop,
          gapBottom,
        },
      );
      if (edge) planeElements.push(edge);
    });

    messageFlows.forEach((mf, index) => {
      const edge = this.createBridgeEdge(
        mf.id,
        mf.flow,
        mf.source,
        mf.target,
        positionByNodeId,
        {
          kind: "message",
          slotIndex: index,
          slotCount: messageFlows.length,
          obstacles,
          gapTop,
          gapBottom,
        },
      );
      if (edge) planeElements.push(edge);
    });

    const plane = this.moddle.create("bpmndi:BPMNPlane", {
      id: "BPMNPlane_1",
      bpmnElement: collaboration ?? processes[0]!.process,
      planeElement: planeElements,
    });

    return this.moddle.create("bpmndi:BPMNDiagram", {
      id: "BPMNDiagram_1",
      plane,
    });
  }

  /**
   * Orthogonal bridge for message flows / data associations.
   * Message flows use a clear horizontal channel in the inter-pool gap
   * (never through a data store), then a vertical riser at the target.
   */
  private createBridgeEdge(
    id: string,
    bpmnElement: any,
    fromId: string,
    toId: string,
    positions: Map<string, Bounds>,
    options: {
      kind: "message" | "data";
      slotIndex: number;
      slotCount: number;
      obstacles: Bounds[];
      gapTop: number;
      gapBottom: number;
    },
  ) {
    const from = positions.get(fromId);
    const to = positions.get(toId);
    if (!from || !to) return null;

    const points =
      options.kind === "message"
        ? this.messageBridgeWaypoints(from, to, options)
        : this.dataBridgeWaypoints(from, to, options);
    if (points.length < 2) return null;

    return this.moddle.create("bpmndi:BPMNEdge", {
      id: `${id}_di`,
      bpmnElement,
      waypoint: points.map((p) =>
        this.moddle.create("dc:Point", {
          x: Math.round(p.x),
          y: Math.round(p.y),
        }),
      ),
    });
  }

  /** Pick a Y in [lo, hi] that does not cut through any obstacle. */
  private clearChannelY(
    lo: number,
    hi: number,
    obstacles: Bounds[],
    preferred: number,
    pad = 14,
  ): number {
    const mid = Math.min(hi, Math.max(lo, preferred));
    const blocked = (y: number) =>
      obstacles.some((o) => y >= o.y - pad && y <= o.y + o.height + pad);

    if (!blocked(mid) && mid >= lo && mid <= hi) return Math.round(mid);

    // Scan outward from preferred within the band.
    for (let d = 8; d <= Math.max(hi - lo, 8); d += 8) {
      for (const y of [preferred - d, preferred + d]) {
        if (y >= lo && y <= hi && !blocked(y)) return Math.round(y);
      }
    }

    // Fallback: just above or below the densest obstacle cluster.
    if (obstacles.length) {
      const above = Math.min(...obstacles.map((o) => o.y)) - pad;
      if (above >= lo && above <= hi) return Math.round(above);
      const below =
        Math.max(...obstacles.map((o) => o.y + o.height)) + pad;
      if (below >= lo && below <= hi) return Math.round(below);
    }

    return Math.round((lo + hi) / 2);
  }

  private messageBridgeWaypoints(
    from: Bounds,
    to: Bounds,
    options: {
      slotIndex: number;
      slotCount: number;
      obstacles: Bounds[];
      gapTop: number;
      gapBottom: number;
    },
  ): Point[] {
    const fromCx = from.x + from.width / 2;
    const toCx = to.x + to.width / 2;
    const goingUp = to.y + to.height <= from.y;

    // Exit top of source (or bottom if target is below).
    const start = goingUp
      ? { x: fromCx, y: from.y }
      : { x: fromCx, y: from.y + from.height };
    const end = goingUp
      ? { x: toCx, y: to.y + to.height }
      : { x: toCx, y: to.y };

    // Nearly aligned — straight vertical message flow (as in hand-drawn samples).
    if (Math.abs(fromCx - toCx) <= 40) {
      const x = Math.round((fromCx + toCx) / 2);
      return dedupePoints([
        { x, y: start.y },
        { x, y: end.y },
      ]);
    }

    const bandLo = options.gapTop + 16;
    const bandHi = options.gapBottom - 16;
    const slotShift =
      options.slotCount <= 1
        ? 0
        : (options.slotIndex - (options.slotCount - 1) / 2) * 22;
    const preferred = (bandLo + bandHi) / 2 + slotShift;
    const channelY = this.clearChannelY(
      bandLo,
      bandHi,
      options.obstacles,
      preferred,
    );

    return dedupePoints([
      start,
      { x: start.x, y: channelY },
      { x: end.x, y: channelY },
      end,
    ]);
  }

  private dataBridgeWaypoints(
    from: Bounds,
    to: Bounds,
    options: {
      slotIndex: number;
      slotCount: number;
      obstacles: Bounds[];
      gapTop: number;
      gapBottom: number;
    },
  ): Point[] {
    const fromCx = from.x + from.width / 2;
    const fromCy = from.y + from.height / 2;
    const toCx = to.x + to.width / 2;
    const toCy = to.y + to.height / 2;
    const stagger =
      options.slotCount <= 1
        ? 0
        : (options.slotIndex - (options.slotCount - 1) / 2) * 16;

    // Store ↔ activity: prefer a short vertical then horizontal in the gap.
    if (toCy >= fromCy) {
      const start = { x: fromCx, y: from.y + from.height };
      const end = { x: toCx, y: to.y };
      const preferred = (start.y + end.y) / 2 + stagger;
      const lo = Math.min(start.y, end.y) + 4;
      const hi = Math.max(start.y, end.y) - 4;
      const midY =
        hi > lo
          ? this.clearChannelY(lo, hi, options.obstacles, preferred)
          : Math.round((start.y + end.y) / 2);
      return dedupePoints([
        start,
        { x: start.x, y: midY },
        { x: end.x, y: midY },
        end,
      ]);
    }

    const start = { x: fromCx, y: from.y };
    const end = { x: toCx, y: to.y + to.height };
    const preferred = (start.y + end.y) / 2 + stagger;
    const lo = Math.min(start.y, end.y) + 4;
    const hi = Math.max(start.y, end.y) - 4;
    const midY =
      hi > lo
        ? this.clearChannelY(lo, hi, options.obstacles, preferred)
        : Math.round((start.y + end.y) / 2);
    return dedupePoints([
      start,
      { x: start.x, y: midY },
      { x: end.x, y: midY },
      end,
    ]);
  }

  private async buildFlatProcess(input: ProcessDiagramInput) {
    const { positions, nodeShapes, edgeShapes } = await this.layoutNodesAndEdges(
      input.elements,
      input.flows,
      input.sourceNodes,
      input.sourceLanes,
      0,
      0,
      false,
    );

    const plane = this.moddle.create("bpmndi:BPMNPlane", {
      id: "BPMNPlane_1",
      bpmnElement: input.process,
      planeElement: [...nodeShapes, ...edgeShapes],
    });

    // silence unused
    void positions;

    return this.moddle.create("bpmndi:BPMNDiagram", {
      id: "BPMNDiagram_1",
      plane,
    });
  }

  private async layoutProcessBlock(
    input: ProcessDiagramInput,
    offsetY: number,
    options: { includeStores?: boolean } = {},
  ) {
    const includeStores = options.includeStores ?? true;
    const hasLanes = input.sourceLanes.length > 0;
    const {
      positions,
      nodeShapes,
      edgeShapes,
      contentWidth,
      contentHeight,
      laneHeights,
    } = await this.layoutNodesAndEdges(
      input.elements,
      input.flows,
      input.sourceNodes,
      input.sourceLanes,
      POOL_OFFSET_X +
        POOL_HEADER_WIDTH +
        (hasLanes ? LANE_HEADER_WIDTH : 0) +
        NODE_IN_LANE_MARGIN_X,
      offsetY,
      hasLanes,
    );

    // Place data stores under content only when not deferred to inter-pool gap.
    let storeBottom = offsetY + contentHeight;
    const storeShapes: any[] = [];
    const stores = includeStores ? (input.dataStoreElements ?? []) : [];
    const storeBaseX = Math.max(
      POOL_OFFSET_X + POOL_HEADER_WIDTH + 80,
      POOL_OFFSET_X + contentWidth / 2 - 25,
    );
    stores.forEach((store, index) => {
      const size = NODE_SIZE.dataStore;
      const bounds = {
        x: storeBaseX + index * 120,
        y: offsetY + contentHeight + 24,
        width: size.width,
        height: size.height,
      };
      positions.set(String(store.id), bounds);
      storeBottom = Math.max(storeBottom, bounds.y + bounds.height);
      storeShapes.push(this.createShape(String(store.id), store, bounds));
    });

    const poolHeight = Math.max(
      hasLanes ? contentHeight : DEFAULT_POOL_HEIGHT,
      storeBottom - offsetY + (stores.length ? CONTENT_PADDING / 2 : 0),
    );
    const poolWidth = Math.max(600, contentWidth + CONTENT_PADDING);

    const participantShape = this.moddle.create("bpmndi:BPMNShape", {
      id: `${input.participant.id}_di`,
      bpmnElement: input.participant,
      isHorizontal: true,
      bounds: this.moddle.create("dc:Bounds", {
        x: POOL_OFFSET_X,
        y: offsetY,
        width: poolWidth,
        height: poolHeight,
      }),
    });

    const laneShapes = hasLanes
      ? this.buildLaneShapes(input, offsetY, poolWidth, laneHeights)
      : [];

    return {
      positions,
      planeElements: [
        participantShape,
        ...laneShapes,
        ...storeShapes,
        ...nodeShapes,
        ...edgeShapes,
      ],
      maxRight: POOL_OFFSET_X + poolWidth,
      bottom: offsetY + poolHeight,
    };
  }

  private buildLaneShapes(
    input: ProcessDiagramInput,
    offsetY: number,
    poolWidth: number,
    laneHeights: number[],
  ) {
    let y = offsetY;
    return input.laneElements.map((lane, index) => {
      const height = laneHeights[index] ?? DEFAULT_LANE_HEIGHT;
      const shape = this.moddle.create("bpmndi:BPMNShape", {
        id: `${lane.id}_di`,
        bpmnElement: lane,
        isHorizontal: true,
        bounds: this.moddle.create("dc:Bounds", {
          x: POOL_OFFSET_X + POOL_HEADER_WIDTH,
          y,
          width: poolWidth - POOL_HEADER_WIDTH,
          height,
        }),
      });
      y += height;
      return shape;
    });
  }

  private async layoutNodesAndEdges(
    elements: any[],
    flows: FlowMeta[],
    sourceNodes: INode[],
    sourceLanes: ILane[],
    originX: number,
    originY: number,
    useLanes: boolean,
  ) {
    const nodes = elements.map((el) => {
      const size = getBoundsForType(el.$type);
      return { id: String(el.id), width: size.width, height: size.height };
    });

    const edges = flows.map((f) => ({
      id: f.id,
      source: f.source,
      target: f.target,
    }));

    const layout = await layoutGraph(nodes, edges);
    const nodeMap = new Map<string, any>();
    for (const child of layout.children ?? []) {
      if (child?.id) nodeMap.set(String(child.id), child);
    }

    const positions = new Map<string, Bounds>();
    let laneHeights: number[] = [];

    if (useLanes && sourceLanes.length) {
      const laneIndexById = new Map(
        sourceLanes.map((lane, index) => [lane.id, index]),
      );

      // Keep ELK X; collect relative Y only to estimate column groups.
      for (const element of elements) {
        const pos = nodeMap.get(String(element.id));
        if (!pos) continue;

        const sourceNode = sourceNodes.find((n) => n.id === element.id);
        const laneId = sourceNode?.laneId ?? sourceLanes[0]!.id;
        const width = Number(pos.width ?? NODE_SIZE.default.width);
        const height = Number(pos.height ?? NODE_SIZE.default.height);

        positions.set(String(element.id), {
          x: originX + Number(pos.x ?? 0),
          y: Number(pos.y ?? 0),
          width,
          height,
        });
        (positions.get(String(element.id)) as any).laneId = laneId;
      }

      // First estimate: pack columns per lane around a provisional mid-line,
      // then size lanes tightly and place absolutely.
      const packedByLane = this.packColumnsByLane(
        positions,
        sourceLanes,
        sourceNodes,
      );

      laneHeights = sourceLanes.map((lane) => {
        const packed = packedByLane.get(lane.id) ?? [];
        if (!packed.length) return DEFAULT_LANE_HEIGHT;
        const maxH = Math.max(...packed.map((p) => p.localY + p.height));
        return Math.max(
          DEFAULT_LANE_HEIGHT,
          maxH + NODE_IN_LANE_PADDING_Y * 2,
        );
      });

      const laneOffsets = laneHeights.reduce<number[]>((acc, _, index) => {
        acc[index] =
          index === 0 ? 0 : acc[index - 1]! + laneHeights[index - 1]!;
        return acc;
      }, []);

      for (const lane of sourceLanes) {
        const laneIndex = laneIndexById.get(lane.id) ?? 0;
        const laneTop = originY + (laneOffsets[laneIndex] ?? 0);
        const packed = packedByLane.get(lane.id) ?? [];
        for (const item of packed) {
          positions.set(item.id, {
            x: item.x,
            y: laneTop + NODE_IN_LANE_PADDING_Y + item.localY,
            width: item.width,
            height: item.height,
          });
        }
      }

      this.alignCrossLaneDrops(positions, flows, sourceNodes);
      this.arrangeEventBasedClusters(positions, flows, sourceNodes);
      this.resolveOverlaps(positions);
      this.refitLanesAfterRearrange(
        positions,
        sourceLanes,
        sourceNodes,
        originY,
        laneHeights,
        laneOffsets,
        laneIndexById,
      );

      // Recompute lane heights from final node extents.
      const maxBottomByLane = new Map<string, number>();
      for (const [id, bounds] of positions) {
        const sourceNode = sourceNodes.find((n) => n.id === id);
        const laneId = sourceNode?.laneId ?? sourceLanes[0]!.id;
        const laneIndex = laneIndexById.get(laneId) ?? 0;
        const laneTop = originY + (laneOffsets[laneIndex] ?? 0);
        const bottomInLane =
          bounds.y + bounds.height - laneTop + NODE_IN_LANE_PADDING_Y;
        maxBottomByLane.set(
          laneId,
          Math.max(maxBottomByLane.get(laneId) ?? 0, bottomInLane),
        );
      }
      laneHeights = sourceLanes.map((lane, index) =>
        Math.max(
          laneHeights[index] ?? DEFAULT_LANE_HEIGHT,
          maxBottomByLane.get(lane.id) ?? 0,
        ),
      );

      const contentHeight = laneHeights.reduce((a, b) => a + b, 0);
      let contentWidth = 400;
      for (const b of positions.values()) {
        contentWidth = Math.max(contentWidth, b.x + b.width - POOL_OFFSET_X);
      }

      return {
        positions,
        nodeShapes: this.createNodeShapes(elements, positions),
        edgeShapes: this.createEdgeShapes(flows, positions),
        contentWidth,
        contentHeight,
        laneHeights,
      };
    }

    // No lanes — ELK coords + origin offset
    for (const element of elements) {
      const pos = nodeMap.get(String(element.id));
      if (!pos) continue;
      positions.set(String(element.id), {
        x: originX + Number(pos.x ?? 0),
        y: originY + Number(pos.y ?? 0),
        width: Number(pos.width ?? NODE_SIZE.default.width),
        height: Number(pos.height ?? NODE_SIZE.default.height),
      });
    }

    this.resolveOverlaps(positions);
    this.arrangeEventBasedClusters(positions, flows, sourceNodes);
    this.alignGatewayBypassTasks(positions, flows, sourceNodes);
    this.resolveOverlaps(positions);

    let contentWidth = 400;
    let contentHeight = DEFAULT_POOL_HEIGHT;
    for (const b of positions.values()) {
      contentWidth = Math.max(contentWidth, b.x + b.width - POOL_OFFSET_X);
      contentHeight = Math.max(
        contentHeight,
        b.y + b.height - originY + NODE_IN_LANE_PADDING_Y,
      );
    }

    return {
      positions,
      nodeShapes: this.createNodeShapes(elements, positions),
      edgeShapes: this.createEdgeShapes(flows, positions),
      contentWidth,
      contentHeight,
      laneHeights: [],
    };
  }

  /**
   * Classic event-based gateway layout (matches hand-drawn BPMN):
   *   [Timer] ---- [Failure End]
   *      |
   * [EventGW] ---- [Rejected]
   *      |
   * [Approved] -- [Make Payment] -- [OK]
   */
  private arrangeEventBasedClusters(
    positions: Map<string, Bounds>,
    flows: FlowMeta[],
    sourceNodes: INode[],
  ) {
    const COMPASS_GAP = 48;
    const SIDE_GAP = 60;
    const nodeById = new Map(sourceNodes.map((n) => [n.id, n]));

    for (const node of sourceNodes) {
      if (node.type !== "eventBasedGateway") continue;
      const gw = positions.get(node.id);
      if (!gw) continue;

      const outs = flows
        .filter((f) => f.source === node.id)
        .map((f) => ({
          id: f.target,
          node: nodeById.get(f.target),
          bounds: positions.get(f.target),
        }))
        .filter((c): c is { id: string; node: INode | undefined; bounds: Bounds } =>
          Boolean(c.bounds),
        );

      const timers = outs.filter((c) => c.node?.eventDefinition === "timer");
      const messages = outs.filter((c) => c.node?.eventDefinition === "message");
      const cx = gw.x + gw.width / 2;
      const cy = gw.y + gw.height / 2;

      const timer = timers[0];
      const approved = messages[0];
      const rejected = messages[1];

      if (timer) {
        positions.set(timer.id, {
          x: Math.round(cx - timer.bounds.width / 2),
          y: Math.round(gw.y - COMPASS_GAP - timer.bounds.height),
          width: timer.bounds.width,
          height: timer.bounds.height,
        });
      }

      if (approved) {
        positions.set(approved.id, {
          x: Math.round(cx - approved.bounds.width / 2),
          y: Math.round(gw.y + gw.height + COMPASS_GAP),
          width: approved.bounds.width,
          height: approved.bounds.height,
        });
      }

      if (rejected) {
        positions.set(rejected.id, {
          x: Math.round(gw.x + gw.width + SIDE_GAP),
          y: Math.round(cy - rejected.bounds.height / 2),
          width: rejected.bounds.width,
          height: rejected.bounds.height,
        });
      }

      const placed = new Set<string>([
        node.id,
        ...outs.map((o) => o.id),
      ]);

      // Failure end: same X as Rejected, same Y as Timer (reference layout).
      if (timer) {
        const endId = flows
          .filter((f) => f.source === timer.id)
          .map((f) => f.target)
          .find((id) => nodeById.get(id)?.type === "end");
        if (endId && positions.has(endId)) {
          const endB = positions.get(endId)!;
          const timerB = positions.get(timer.id)!;
          const rejectedB = rejected ? positions.get(rejected.id) : null;
          positions.set(endId, {
            x: Math.round(
              rejectedB ? rejectedB.x : timerB.x + timerB.width + SIDE_GAP,
            ),
            y: Math.round(timerB.y),
            width: endB.width,
            height: endB.height,
          });
          placed.add(endId);
        }
      }

      const placeChain = (startId: string) => {
        let current = startId;
        for (let i = 0; i < 8; i++) {
          const next = flows
            .filter((f) => f.source === current)
            .map((f) => f.target)
            .find((id) => positions.has(id) && !placed.has(id));
          if (!next) break;

          const cur = positions.get(current)!;
          const nb = positions.get(next)!;
          positions.set(next, {
            x: Math.round(cur.x + cur.width + SIDE_GAP),
            y: Math.round(cur.y + cur.height / 2 - nb.height / 2),
            width: nb.width,
            height: nb.height,
          });
          placed.add(next);
          current = next;
        }
      };

      if (approved) placeChain(approved.id);
      // Remaining timer/message outs without shared end already placed.
      for (const t of timers) placeChain(t.id);
      for (const m of messages.slice(1)) placeChain(m.id);
    }
  }

  /**
   * Nudge a pure cross-lane drop (1 out → 1 in) onto the source column
   * only when ELK already placed both nodes nearly in the same column.
   *
   * Full realignment collapses left-to-right chains that zigzag across
   * lanes (Pack → Deliver → Notify → Success) into one unreadable stack.
   */
  private alignCrossLaneDrops(
    positions: Map<string, Bounds>,
    flows: FlowMeta[],
    sourceNodes: INode[],
  ) {
    const nodeById = new Map(sourceNodes.map((n) => [n.id, n]));
    for (const flow of flows) {
      const s = nodeById.get(flow.source);
      const t = nodeById.get(flow.target);
      if (!s?.laneId || !t?.laneId || s.laneId === t.laneId) continue;

      const outs = flows.filter((f) => f.source === flow.source).length;
      const inns = flows.filter((f) => f.target === flow.target).length;
      if (outs !== 1 || inns !== 1) continue;

      const sb = positions.get(s.id);
      const tb = positions.get(t.id);
      if (!sb || !tb) continue;

      const scx = sb.x + sb.width / 2;
      const tcx = tb.x + tb.width / 2;
      // Preserve ELK layer spacing for forward/backward hops.
      if (Math.abs(scx - tcx) > COLUMN_X_TOLERANCE) continue;

      positions.set(t.id, {
        ...tb,
        x: Math.round(scx - tb.width / 2),
      });
    }
  }

  /**
   * Exclusive gateway bypass: keep the optional task on the main spine
   * so the "NO" edge can route above it (as in hand-drawn samples).
   */
  private alignGatewayBypassTasks(
    positions: Map<string, Bounds>,
    flows: FlowMeta[],
    sourceNodes: INode[],
  ) {
    const nodeById = new Map(sourceNodes.map((n) => [n.id, n]));
    for (const node of sourceNodes) {
      if (node.type !== "exclusiveGateway") continue;
      const outs = flows.filter((f) => f.source === node.id);
      if (outs.length !== 2) continue;

      const targets = outs.map((o) => ({
        id: o.target,
        node: nodeById.get(o.target),
      }));
      const task = targets.find(
        (t) =>
          t.node &&
          !String(t.node.type).includes("Gateway") &&
          t.node.type !== "end" &&
          t.node.type !== "start" &&
          t.node.type !== "intermediateCatch",
      );
      const join = targets.find((t) =>
        String(t.node?.type ?? "").includes("Gateway"),
      );
      if (!task || !join) continue;

      const gw = positions.get(node.id);
      const taskB = positions.get(task.id);
      const joinB = positions.get(join.id);
      if (!gw || !taskB || !joinB) continue;

      const cy = gw.y + gw.height / 2;
      positions.set(task.id, {
        ...taskB,
        y: Math.round(cy - taskB.height / 2),
      });
      positions.set(join.id, {
        ...joinB,
        y: Math.round(cy - joinB.height / 2),
      });
    }
  }

  /**
   * After compass rearrange, keep nodes inside their lanes and push
   * subsequent lanes down if a lane grew.
   */
  private refitLanesAfterRearrange(
    positions: Map<string, Bounds>,
    sourceLanes: ILane[],
    sourceNodes: INode[],
    originY: number,
    laneHeights: number[],
    laneOffsets: number[],
    laneIndexById: Map<string, number>,
  ) {
    for (let index = 0; index < sourceLanes.length; index++) {
      const lane = sourceLanes[index]!;
      const laneTop = originY + (laneOffsets[index] ?? 0);
      const ids = [...positions.keys()].filter((id) => {
        const n = sourceNodes.find((sn) => sn.id === id);
        return (n?.laneId ?? sourceLanes[0]!.id) === lane.id;
      });
      if (!ids.length) continue;

      let minY = Infinity;
      let maxBottom = 0;
      for (const id of ids) {
        const b = positions.get(id)!;
        minY = Math.min(minY, b.y);
        maxBottom = Math.max(maxBottom, b.y + b.height);
      }

      const pad = NODE_IN_LANE_PADDING_Y;
      // Skip-edge channel reserve only when the lane has an event-based
      // gateway cluster (timer/end sit near the top of the lane).
      const needsChannelReserve = ids.some((id) => {
        const n = sourceNodes.find((sn) => sn.id === id);
        return n?.type === "eventBasedGateway";
      });
      const topReserve = needsChannelReserve ? 52 : 0;
      if (minY < laneTop + pad + topReserve) {
        const shift = laneTop + pad + topReserve - minY;
        for (const id of ids) {
          const b = positions.get(id)!;
          positions.set(id, { ...b, y: b.y + shift });
        }
        maxBottom += shift;
      }

      laneHeights[index] = Math.max(
        DEFAULT_LANE_HEIGHT,
        maxBottom - laneTop + pad,
      );
    }

    // Rebuild offsets and shift later lanes if earlier lanes grew.
    for (let index = 1; index < sourceLanes.length; index++) {
      const expectedTop =
        originY +
        laneHeights.slice(0, index).reduce((a, b) => a + b, 0);
      const prevTop = originY + (laneOffsets[index] ?? 0);
      const delta = expectedTop - prevTop;
      laneOffsets[index] = expectedTop - originY;
      if (Math.abs(delta) < 1) continue;

      const lane = sourceLanes[index]!;
      for (const [id, b] of positions) {
        const n = sourceNodes.find((sn) => sn.id === id);
        if ((n?.laneId ?? sourceLanes[0]!.id) !== lane.id) continue;
        positions.set(id, { ...b, y: b.y + delta });
      }
    }

    void laneIndexById;
  }

  /**
   * Place nodes within each lane.
   * - Default: keep ELK X and relative Y (works for loops / multi-lane order flows).
   * - Catch-only columns (intermediateCatch sharing X): stack with BRANCH_GAP
   *   for event-gateway fan-outs; arrangeEventBasedClusters may still override.
   */
  private packColumnsByLane(
    positions: Map<string, Bounds>,
    sourceLanes: ILane[],
    sourceNodes: INode[],
  ) {
    type Packed = {
      id: string;
      x: number;
      localY: number;
      width: number;
      height: number;
    };

    const result = new Map<string, Packed[]>();
    const nodeById = new Map(sourceNodes.map((n) => [n.id, n]));

    for (const lane of sourceLanes) {
      const ids = [...positions.keys()].filter((id) => {
        const node = nodeById.get(id);
        return (node?.laneId ?? sourceLanes[0]!.id) === lane.id;
      });

      const minY = ids.reduce((m, id) => {
        const y = positions.get(id)!.y;
        return Math.min(m, y);
      }, Infinity);

      const sorted = ids
        .map((id) => ({ id, bounds: positions.get(id)! }))
        .sort((a, b) => a.bounds.x - b.bounds.x);

      const columns: { id: string; bounds: Bounds }[][] = [];
      for (const item of sorted) {
        const last = columns[columns.length - 1];
        if (
          last &&
          Math.abs(item.bounds.x - last[0]!.bounds.x) <= COLUMN_X_TOLERANCE
        ) {
          last.push(item);
        } else {
          columns.push([item]);
        }
      }

      const packed: Packed[] = [];
      for (const column of columns) {
        column.sort((a, b) => a.bounds.y - b.bounds.y);
        const allCatch = column.every(
          (c) => nodeById.get(c.id)?.type === "intermediateCatch",
        );

        if (allCatch && column.length > 1) {
          let y = 0;
          const x = Math.round(
            column.reduce((s, c) => s + c.bounds.x, 0) / column.length,
          );
          for (const item of column) {
            packed.push({
              id: item.id,
              x,
              localY: y,
              width: item.bounds.width,
              height: item.bounds.height,
            });
            y += item.bounds.height + BRANCH_GAP;
          }
        } else {
          // Preserve ELK geometry within the lane (no forced mid-line stack).
          for (const item of column) {
            packed.push({
              id: item.id,
              x: item.bounds.x,
              localY: item.bounds.y - (Number.isFinite(minY) ? minY : 0),
              width: item.bounds.width,
              height: item.bounds.height,
            });
          }
        }
      }

      // Center catch-only stacks against the tallest content in the lane.
      const maxStack = packed.reduce(
        (m, p) => Math.max(m, p.localY + p.height),
        0,
      );
      const byCol = new Map<number, Packed[]>();
      for (const p of packed) {
        const key = Math.round(p.x / COLUMN_X_TOLERANCE);
        if (!byCol.has(key)) byCol.set(key, []);
        byCol.get(key)!.push(p);
      }
      for (const group of byCol.values()) {
        const isCatchStack =
          group.length > 1 &&
          group.every((g) => nodeById.get(g.id)?.type === "intermediateCatch");
        if (!isCatchStack) continue;
        const stackH = Math.max(...group.map((g) => g.localY + g.height));
        const shift = (maxStack - stackH) / 2;
        for (const g of group) g.localY += shift;
      }

      result.set(lane.id, packed);
    }

    return result;
  }

  /** Nudge nodes that still occupy the same space after layout. */
  private resolveOverlaps(positions: Map<string, Bounds>) {
    const ids = [...positions.keys()];
    const gap = 24;

    for (let pass = 0; pass < 8; pass++) {
      let moved = false;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = positions.get(ids[i]!)!;
          const b = positions.get(ids[j]!)!;
          const overlapX =
            Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const overlapY =
            Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if (overlapX <= 0 || overlapY <= 0) continue;

          // Prefer vertical separation for same-column overlaps.
          if (Math.abs(a.x - b.x) < Math.max(a.width, b.width) * 0.75) {
            if (a.y <= b.y) {
              b.y = a.y + a.height + gap;
            } else {
              a.y = b.y + b.height + gap;
            }
          } else if (a.x <= b.x) {
            b.x = a.x + a.width + gap;
          } else {
            a.x = b.x + b.width + gap;
          }
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  private createShape(
    id: string,
    bpmnElement: any,
    bounds: Bounds,
    extra?: { isHorizontal?: boolean },
  ) {
    const shape = this.moddle.create("bpmndi:BPMNShape", {
      id: `${id}_di`,
      bpmnElement,
      ...(extra?.isHorizontal !== undefined
        ? { isHorizontal: extra.isHorizontal }
        : {}),
      bounds: this.moddle.create("dc:Bounds", {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: bounds.width,
        height: bounds.height,
      }),
    });
    applyDiColor(shape, this.colorsById.get(id));
    return shape;
  }

  private createNodeShapes(elements: any[], positions: Map<string, Bounds>) {
    return elements
      .map((el) => {
        const b = positions.get(String(el.id));
        if (!b) return null;
        return this.createShape(String(el.id), el, b);
      })
      .filter(Boolean);
  }

  private createEdgeShapes(flows: FlowMeta[], positions: Map<string, Bounds>) {
    const waypoints = routeOrthogonalEdges(
      flows.map((f) => ({
        id: f.id,
        sourceId: f.source,
        targetId: f.target,
      })),
      positions,
    );

    return flows
      .map((meta) => {
        const points = waypoints.get(meta.id);
        if (!points || points.length < 2 || !meta.flow) return null;
        return this.moddle.create("bpmndi:BPMNEdge", {
          id: `${meta.id}_di`,
          bpmnElement: meta.flow,
          waypoint: points.map((p) =>
            this.moddle.create("dc:Point", {
              x: Math.round(p.x),
              y: Math.round(p.y),
            }),
          ),
        });
      })
      .filter(Boolean);
  }
}
