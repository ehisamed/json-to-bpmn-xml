type Bounds = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type Side = "left" | "right" | "top" | "bottom";

export type EdgeRouteInput = {
  id: string;
  sourceId: string;
  targetId: string;
  /** Activity owning a boundary-event source, if this is a boundary flow. */
  sourceAttachedToId?: string;
};

const NODE_PAD = 12;
const CHANNEL_GAP = 40;

function center(b: Bounds): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function approx(a: number, b: number, eps = 1) {
  return Math.abs(a - b) < eps;
}

export function dedupePoints(points: Point[]): Point[] {
  return points.filter((point, index) => {
    if (index === 0) return true;
    const prev = points[index - 1]!;
    return !approx(point.x, prev.x, 0.5) || !approx(point.y, prev.y, 0.5);
  });
}

function inflate(b: Bounds, pad = NODE_PAD): Bounds {
  return {
    x: b.x - pad,
    y: b.y - pad,
    width: b.width + pad * 2,
    height: b.height + pad * 2,
  };
}

/** True if point is strictly inside bounds (not on the border). */
export function pointInside(p: Point, b: Bounds, pad = 1): boolean {
  return (
    p.x > b.x + pad &&
    p.x < b.x + b.width - pad &&
    p.y > b.y + pad &&
    p.y < b.y + b.height - pad
  );
}

function segmentHitsBounds(a: Point, b: Point, obstacle: Bounds): boolean {
  const o = inflate(obstacle);
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);

  if (approx(a.x, b.x)) {
    const x = a.x;
    return (
      x >= o.x &&
      x <= o.x + o.width &&
      maxY >= o.y &&
      minY <= o.y + o.height
    );
  }

  if (approx(a.y, b.y)) {
    const y = a.y;
    return (
      y >= o.y &&
      y <= o.y + o.height &&
      maxX >= o.x &&
      minX <= o.x + o.width
    );
  }

  return false;
}

function pathHitsObstacle(
  points: Point[],
  ignoreIds: Set<string>,
  boundsById: Map<string, Bounds>,
): boolean {
  for (const [id, bounds] of boundsById) {
    if (ignoreIds.has(id)) continue;
    for (let i = 1; i < points.length; i++) {
      if (segmentHitsBounds(points[i - 1]!, points[i]!, bounds)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Intermediate waypoints must not sit inside any node (including endpoints' nodes).
 * First/last points are dock anchors on the border — allowed.
 */
function pathEntersNodeInterior(
  points: Point[],
  boundsById: Map<string, Bounds>,
): boolean {
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const isDock = i === 0 || i === points.length - 1;
    for (const bounds of boundsById.values()) {
      if (isDock) {
        // Dock may lie on the border; reject only deep interior.
        if (pointInside(p, bounds, 2)) return true;
      } else if (pointInside(p, bounds, 0)) {
        return true;
      }
    }
  }
  return false;
}

function dockPoint(b: Bounds, side: Side, ratio: number): Point {
  // Gateways are diamonds: only the four vertices sit on the drawn shape.
  // Off-center docks on the AABB look "floating" next to the slanted edge.
  const r = isGatewayDiamond(b)
    ? 0.5
    : Math.min(0.85, Math.max(0.15, ratio));

  switch (side) {
    case "left":
      return { x: b.x, y: b.y + b.height * r };
    case "right":
      return { x: b.x + b.width, y: b.y + b.height * r };
    case "top":
      return { x: b.x + b.width * r, y: b.y };
    case "bottom":
      return { x: b.x + b.width * r, y: b.y + b.height };
  }
}

function routeBoundaryEdge(
  source: Bounds,
  target: Bounds,
  attached: Bounds,
): Point[] {
  const sourceBottom = { x: source.x + source.width / 2, y: source.y + source.height };
  const targetCenter = center(target);
  const channelX = attached.x - CHANNEL_GAP;
  const channelY = attached.y + attached.height + CHANNEL_GAP;
  const targetSide: Side = targetCenter.x <= channelX ? "right" : "left";
  const targetDock = dockPoint(target, targetSide, 0.5);

  return dedupePoints([
    sourceBottom,
    { x: sourceBottom.x, y: channelY },
    { x: channelX, y: channelY },
    { x: channelX, y: targetDock.y },
    targetDock,
  ]);
}

/** Exclusive/parallel gateways are ~50×50 diamonds in DI (not 36×36 events). */
function isGatewayDiamond(b: Bounds): boolean {
  return (
    b.width >= 45 &&
    b.width <= 55 &&
    b.height >= 45 &&
    b.height <= 55
  );
}

function hasNodeBetweenHorizontally(
  source: Bounds,
  target: Bounds,
  boundsById: Map<string, Bounds>,
  sourceId: string,
  targetId: string,
): boolean {
  const gapLeft = Math.min(source.x + source.width, target.x + target.width);
  const gapRight = Math.max(source.x, target.x);
  if (gapRight <= gapLeft) return false;

  const bandTop = Math.min(source.y, target.y);
  const bandBottom = Math.max(
    source.y + source.height,
    target.y + target.height,
  );

  for (const [id, b] of boundsById) {
    if (id === sourceId || id === targetId) continue;
    const overlapY =
      Math.min(bandBottom, b.y + b.height) - Math.max(bandTop, b.y);
    if (overlapY <= 0) continue;
    if (b.x < gapRight && b.x + b.width > gapLeft) return true;
  }
  return false;
}

function hasNodeBetweenVertically(
  source: Bounds,
  target: Bounds,
  boundsById: Map<string, Bounds>,
  sourceId: string,
  targetId: string,
): boolean {
  const gapTop = Math.min(source.y + source.height, target.y + target.height);
  const gapBottom = Math.max(source.y, target.y);
  if (gapBottom <= gapTop) return false;

  const bandLeft = Math.min(source.x, target.x);
  const bandRight = Math.max(source.x + source.width, target.x + target.width);

  for (const [id, b] of boundsById) {
    if (id === sourceId || id === targetId) continue;
    const overlapX =
      Math.min(bandRight, b.x + b.width) - Math.max(bandLeft, b.x);
    if (overlapX <= 0) continue;
    if (b.y < gapBottom && b.y + b.height > gapTop) return true;
  }
  return false;
}

function hasNodeDirectlyBelow(
  source: Bounds,
  boundsById: Map<string, Bounds>,
  sourceId: string,
  targetId: string,
): boolean {
  const sc = center(source);
  for (const [id, b] of boundsById) {
    if (id === sourceId || id === targetId) continue;
    if (b.y + b.height <= source.y + source.height) continue;
    const overlapX =
      Math.min(source.x + source.width, b.x + b.width) -
      Math.max(source.x, b.x);
    if (overlapX > source.width * 0.4) {
      if (Math.abs(center(b).x - sc.x) < Math.max(source.width, b.width)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Vertical channel for a backward edge that stays outside the target
 * so the final approach reaches the dock from outside the shape.
 */
function backwardBypassX(
  from: Point,
  to: Point,
  toSide: Side,
  target: Bounds,
  source: Bounds,
): number {
  if (toSide === "right") {
    // Must approach right dock from x > target.right.
    const minOutside = target.x + target.width + CHANNEL_GAP;
    const nearSource = source.x - CHANNEL_GAP;
    return Math.max(minOutside, Math.min(nearSource, from.x - 20));
  }

  if (toSide === "left") {
    // Approach left dock from x < target.left.
    const maxOutside = target.x - CHANNEL_GAP;
    return Math.min(maxOutside, from.x - CHANNEL_GAP, to.x - CHANNEL_GAP);
  }

  return Math.min(from.x, to.x) - CHANNEL_GAP;
}

/**
 * Choose attachment sides for swimlane-friendly orthogonal routing.
 */
export function chooseSides(
  source: Bounds,
  target: Bounds,
  options?: {
    sourceId?: string;
    targetId?: string;
    boundsById?: Map<string, Bounds>;
  },
): [Side, Side] {
  const sc = center(source);
  const tc = center(target);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  const band = Math.max(source.height, target.height) * 0.55;

  if (Math.abs(dy) <= band) {
    return dx >= 0 ? ["right", "left"] : ["left", "right"];
  }

  const closeX = Math.abs(dx) <= Math.max(source.width, target.width) * 0.75;
  if (closeX) {
    // Node sitting between two same-column shapes → leave via the side
    // so the vertical channel does not cut through the middle node.
    if (
      options?.boundsById &&
      options.sourceId &&
      options.targetId &&
      hasNodeBetweenVertically(
        source,
        target,
        options.boundsById,
        options.sourceId,
        options.targetId,
      )
    ) {
      return dx >= 0 ? ["right", "left"] : ["left", "right"];
    }
    return dy > 0 ? ["bottom", "top"] : ["top", "bottom"];
  }

  // Short forward hops with modest vertical offset (event-gateway fan-out):
  // keep side docks instead of leaving via top/bottom.
  if (dx > 0 && dx <= 220 && Math.abs(dy) <= 150) {
    return ["right", "left"];
  }

  if (dx > 0 && dy < -band) {
    // Upward-forward: always approach from the left. top→top forced the
    // obstacle bypass onto the target's RIGHT (parallel Join↔End collision);
    // right→bottom looked jagged on diamond gateways.
    return ["right", "left"];
  }

  if (dx > 0) {
    return ["right", "left"];
  }

  if (
    dy > 0 &&
    options?.boundsById &&
    options.sourceId &&
    options.targetId &&
    hasNodeDirectlyBelow(
      source,
      options.boundsById,
      options.sourceId,
      options.targetId,
    )
  ) {
    return ["left", "right"];
  }

  return dy > 0 ? ["bottom", "right"] : ["top", "right"];
}

/**
 * When several edges leave one node toward different heights, dock on
 * compass sides (top / right / bottom) instead of slotting all on the
 * right face — that caused detached stubs, Yes/No crossings, and double
 * lines next to Path A in parallel split.
 */
function assignCompassFanOut(
  planned: {
    id: string;
    sourceId: string;
    targetId: string;
    fromSide: Side;
    toSide: Side;
  }[],
  boundsById: Map<string, Bounds>,
): void {
  const bySource = new Map<string, typeof planned>();
  for (const edge of planned) {
    if (!bySource.has(edge.sourceId)) bySource.set(edge.sourceId, []);
    bySource.get(edge.sourceId)!.push(edge);
  }

  for (const [sourceId, group] of bySource) {
    if (group.length < 2) continue;
    const source = boundsById.get(sourceId);
    if (!source) continue;
    const sc = center(source);

    const ordered = [...group].sort((a, b) => {
      const ta = center(boundsById.get(a.targetId)!);
      const tb = center(boundsById.get(b.targetId)!);
      const d = ta.y - tb.y;
      if (Math.abs(d) > 1) return d;
      return a.id.localeCompare(b.id);
    });

    const meta = ordered.map((edge) => {
      const t = boundsById.get(edge.targetId)!;
      const tc = center(t);
      return {
        edge,
        dy: tc.y - sc.y,
        dx: tc.x - sc.x,
        forward: tc.x >= sc.x - 2,
      };
    });

    if (!meta.every((m) => m.forward)) continue;

    const diamond = isGatewayDiamond(source);
    const band = Math.max(source.height * 0.55, 28);

    // Diamonds only have four vertices — never slot-spread on one face.
    // 2-way and 3-way both use compass sides (top / right / bottom).
    for (const m of meta) {
      if (m.dy < -band) {
        m.edge.fromSide = "top";
        m.edge.toSide = "left";
      } else if (m.dy > band) {
        m.edge.fromSide = "bottom";
        m.edge.toSide = "left";
      } else {
        m.edge.fromSide = "right";
      }
    }

    // Same-row exclusive bypass (Overdraft? → Join over Approve): top→top.
    if (diamond && meta.length === 2) {
      for (const m of meta) {
        const target = boundsById.get(m.edge.targetId)!;
        if (
          isGatewayDiamond(target) &&
          Math.abs(m.dy) <= band &&
          hasNodeBetweenHorizontally(
            source,
            target,
            boundsById,
            sourceId,
            m.edge.targetId,
          )
        ) {
          m.edge.fromSide = "top";
          m.edge.toSide = "top";
        }
      }
    }

    // Never park two outs on the same top/bottom vertex (Critical?).
    const demoteExtras = (side: "top" | "bottom") => {
      const onSide = meta
        .filter((m) => m.edge.fromSide === side)
        .sort((a, b) => (side === "top" ? a.dy - b.dy : b.dy - a.dy));
      for (let i = 1; i < onSide.length; i++) {
        onSide[i]!.edge.fromSide = "right";
        onSide[i]!.edge.toSide = "left";
      }
    };
    demoteExtras("top");
    demoteExtras("bottom");

    // If everything collapsed to the same side but targets clearly span
    // vertically (3-way Accept/Hold/Reject), force compass vertices.
    const sides = new Set(meta.map((m) => m.edge.fromSide));
    if (sides.size === 1 && meta.length >= 3) {
      const ys = meta.map((m) => m.dy);
      if (Math.max(...ys) - Math.min(...ys) > band * 2) {
        const ranked = [...meta].sort((a, b) => a.dy - b.dy);
        ranked[0]!.edge.fromSide = "top";
        ranked[0]!.edge.toSide = "left";
        ranked[ranked.length - 1]!.edge.fromSide = "bottom";
        ranked[ranked.length - 1]!.edge.toSide = "left";
        for (let i = 1; i < ranked.length - 1; i++) {
          ranked[i]!.edge.fromSide = "right";
        }
      }
    }
  }

  // Diamond joins: level path → left vertex, lower path → bottom vertex.
  const byTarget = new Map<string, typeof planned>();
  const outCount = new Map<string, number>();
  for (const edge of planned) {
    if (!byTarget.has(edge.targetId)) byTarget.set(edge.targetId, []);
    byTarget.get(edge.targetId)!.push(edge);
    outCount.set(edge.sourceId, (outCount.get(edge.sourceId) ?? 0) + 1);
  }

  for (const [targetId, group] of byTarget) {
    if (group.length < 2) continue;
    if ((outCount.get(targetId) ?? 0) < 1) continue;
    const target = boundsById.get(targetId);
    if (!target || !isGatewayDiamond(target)) continue;
    const tc = center(target);

    const ordered = [...group].sort((a, b) => {
      const sa = center(boundsById.get(a.sourceId)!);
      const sb = center(boundsById.get(b.sourceId)!);
      const d = sa.y - sb.y;
      if (Math.abs(d) > 1) return d;
      return a.id.localeCompare(b.id);
    });

    // Keep an intentional top→top bypass if already planned.
    const topBypass = ordered.filter((e) => e.toSide === "top");
    const rest = ordered.filter((e) => e.toSide !== "top");
    if (rest.length === 0) continue;

    const lower = rest[rest.length - 1]!;
    const lowerSrc = center(boundsById.get(lower.sourceId)!);
    if (lowerSrc.y - tc.y > 40 && lowerSrc.x < tc.x) {
      lower.fromSide = "right";
      lower.toSide = "bottom";
    }
    for (const e of rest) {
      if (e === lower && lower.toSide === "bottom") continue;
      if (e.toSide === "top") continue;
      const s = center(boundsById.get(e.sourceId)!);
      if (s.x < tc.x) {
        e.fromSide = "right";
        e.toSide = "left";
      }
    }
    void topBypass;
  }
}

function routeBetweenDocks(
  from: Point,
  to: Point,
  fromSide: Side,
  toSide: Side,
  source: Bounds,
  target: Bounds,
  channelOffset = 0,
): Point[] {
  if (approx(from.y, to.y) || approx(from.x, to.x)) {
    return dedupePoints([from, to]);
  }

  const fromHorizontal = fromSide === "left" || fromSide === "right";
  const toHorizontal = toSide === "left" || toSide === "right";

  if (fromHorizontal && toHorizontal) {
    if (to.x >= from.x - 2) {
      if (Math.abs(from.y - to.y) <= 16) {
        // Never slide the start dock on a diamond — off-center right
        // docks float away from the drawn vertex.
        if (isGatewayDiamond(source)) {
          if (approx(from.y, to.y)) {
            return dedupePoints([from, to]);
          }
          const smallTarget =
            Math.max(target.width, target.height) <= 40;
          if (
            toSide === "left" &&
            from.y >= target.y - 1 &&
            from.y <= target.y + target.height + 1
          ) {
            if (smallTarget) {
              // Drop/rise to the shared end axis, then enter horizontally.
              const midX = Math.round((from.x + to.x) / 2) + channelOffset;
              return dedupePoints([
                from,
                { x: midX, y: from.y },
                { x: midX, y: to.y },
                to,
              ]);
            }
            return dedupePoints([from, { x: target.x, y: from.y }]);
          }
          return dedupePoints([
            from,
            { x: to.x, y: from.y },
            to,
          ]);
        }
        const y = to.y;
        return dedupePoints([
          { x: from.x, y },
          { x: to.x, y },
        ]);
      }

      const midX = Math.round((from.x + to.x) / 2) + channelOffset;
      return dedupePoints([
        from,
        { x: midX, y: from.y },
        { x: midX, y: to.y },
        to,
      ]);
    }

    const bypassX = backwardBypassX(from, to, toSide, target, source);
    return dedupePoints([
      from,
      { x: bypassX, y: from.y },
      { x: bypassX, y: to.y },
      to,
    ]);
  }

  if (!fromHorizontal && !toHorizontal) {
    // Nearly aligned column — keep a straight vertical segment.
    if (Math.abs(from.x - to.x) <= 12) {
      const x = Math.round((from.x + to.x) / 2);
      return dedupePoints([
        { x, y: from.y },
        { x, y: to.y },
      ]);
    }

    if (fromSide === "top" && toSide === "top") {
      const midY = Math.min(from.y, to.y) - CHANNEL_GAP;
      return dedupePoints([
        from,
        { x: from.x, y: midY },
        { x: to.x, y: midY },
        to,
      ]);
    }

    if (fromSide === "bottom" && toSide === "bottom") {
      const midY = Math.max(from.y, to.y) + CHANNEL_GAP;
      return dedupePoints([
        from,
        { x: from.x, y: midY },
        { x: to.x, y: midY },
        to,
      ]);
    }

    if (
      (fromSide === "bottom" && to.y >= from.y) ||
      (fromSide === "top" && to.y <= from.y)
    ) {
      const midY = Math.round((from.y + to.y) / 2);
      return dedupePoints([
        from,
        { x: from.x, y: midY },
        { x: to.x, y: midY },
        to,
      ]);
    }
  }

  if (!fromHorizontal && toHorizontal) {
    // Leaving top/bottom toward a side dock: go vertical first whenever
    // the exit column is already clear of the target (typical fan-out).
    // Forcing a left-of-target column first created the "detached stub"
    // next to gateway vertices (Hold / Reject).
    if (toSide === "left" && from.x <= target.x + 1) {
      return dedupePoints([from, { x: from.x, y: to.y }, to]);
    }
    if (toSide === "right" && from.x >= target.x + target.width - 1) {
      return dedupePoints([from, { x: from.x, y: to.y }, to]);
    }

    let columnX = from.x;
    if (toSide === "right" && columnX < target.x + target.width) {
      columnX = target.x + target.width + CHANNEL_GAP;
      return dedupePoints([
        from,
        { x: columnX, y: from.y },
        { x: columnX, y: to.y },
        to,
      ]);
    }
    if (toSide === "left" && columnX > target.x) {
      columnX = target.x - CHANNEL_GAP;
      return dedupePoints([
        from,
        { x: columnX, y: from.y },
        { x: columnX, y: to.y },
        to,
      ]);
    }
    return dedupePoints([from, { x: from.x, y: to.y }, to]);
  }

  if (fromHorizontal && !toHorizontal) {
    return dedupePoints([from, { x: to.x, y: from.y }, to]);
  }

  const midX = Math.round((from.x + to.x) / 2) + channelOffset;
  return dedupePoints([
    from,
    { x: midX, y: from.y },
    { x: midX, y: to.y },
    to,
  ]);
}

function avoidObstacles(
  points: Point[],
  from: Point,
  to: Point,
  fromSide: Side,
  toSide: Side,
  source: Bounds,
  target: Bounds,
  sourceId: string,
  targetId: string,
  boundsById: Map<string, Bounds>,
): Point[] {
  const ignoreOthers = new Set([sourceId, targetId]);
  const invalid =
    pathHitsObstacle(points, ignoreOthers, boundsById) ||
    pathEntersNodeInterior(points, boundsById);

  if (!invalid) return points;

  const candidates: Point[][] = [];

  // Clear horizontal channel ABOVE all nodes between source and target —
  // preferred for long skip edges (e.g. gateway "No" → distant end).
  const spanMinX = Math.min(source.x, target.x) - NODE_PAD;
  const spanMaxX = Math.max(source.x + source.width, target.x + target.width) + NODE_PAD;
  let topClearY = Math.min(source.y, target.y) - CHANNEL_GAP;
  let bottomClearY =
    Math.max(source.y + source.height, target.y + target.height) + CHANNEL_GAP;
  for (const [id, b] of boundsById) {
    if (id === sourceId || id === targetId) continue;
    const overlapsX = b.x < spanMaxX && b.x + b.width > spanMinX;
    if (!overlapsX) continue;
    topClearY = Math.min(topClearY, b.y - CHANNEL_GAP);
    bottomClearY = Math.max(bottomClearY, b.y + b.height + CHANNEL_GAP);
  }

  // Side bypass when a same-column vertical run is blocked by a mid node.
  // Forward edges approach from the LEFT (not right) so they don't share
  // the outgoing dock of a join gateway.
  {
    const rightX =
      Math.max(source.x + source.width, target.x + target.width) + CHANNEL_GAP;
    const leftX = Math.min(source.x, target.x) - CHANNEL_GAP;
    const fromRight = {
      x: source.x + source.width,
      y: source.y + source.height / 2,
    };
    const toRight = {
      x: target.x + target.width,
      y: target.y + target.height / 2,
    };
    const fromLeft = { x: source.x, y: source.y + source.height / 2 };
    const toLeft = { x: target.x, y: target.y + target.height / 2 };
    const forward = to.x >= from.x - 2;

    if (forward) {
      // Keep the planned dock first — alternate left-center docks look like
      // accidental fan-in when several edges share an end event.
      candidates.push(
        dedupePoints([
          fromRight,
          { x: rightX, y: fromRight.y },
          { x: rightX, y: to.y },
          to,
        ]),
      );
      candidates.push(
        dedupePoints([
          fromLeft,
          { x: leftX, y: fromLeft.y },
          { x: leftX, y: to.y },
          to,
        ]),
      );
      candidates.push(
        dedupePoints([
          from,
          { x: rightX, y: from.y },
          { x: rightX, y: to.y },
          to,
        ]),
      );
    } else {
      candidates.push(
        dedupePoints([
          fromRight,
          { x: rightX, y: fromRight.y },
          { x: rightX, y: toRight.y },
          toRight,
        ]),
      );
      candidates.push(
        dedupePoints([
          fromLeft,
          { x: leftX, y: fromLeft.y },
          { x: leftX, y: toLeft.y },
          toLeft,
        ]),
      );
    }
  }

  if (to.x >= from.x - 2) {
    const topStart = {
      x: source.x + source.width / 2,
      y: source.y,
    };
    const topEnd = {
      x: target.x + target.width / 2,
      y: target.y,
    };
    const bottomStart = {
      x: source.x + source.width / 2,
      y: source.y + source.height,
    };
    const bottomEnd = {
      x: target.x + target.width / 2,
      y: target.y + target.height,
    };

    // Prefer re-docking on top/bottom so clear-channel routes stay
    // clean (no stub into a side dock after the vertical drop).
    candidates.push(
      dedupePoints([
        topStart,
        { x: topStart.x, y: topClearY },
        { x: topEnd.x, y: topClearY },
        topEnd,
      ]),
    );
    candidates.push(
      dedupePoints([
        from,
        { x: from.x, y: topClearY },
        { x: topEnd.x, y: topClearY },
        topEnd,
      ]),
    );
    candidates.push(
      dedupePoints([
        bottomStart,
        { x: bottomStart.x, y: bottomClearY },
        { x: bottomEnd.x, y: bottomClearY },
        bottomEnd,
      ]),
    );
    candidates.push(
      dedupePoints([
        from,
        { x: from.x, y: bottomClearY },
        { x: bottomEnd.x, y: bottomClearY },
        bottomEnd,
      ]),
    );

    // Side-dock bypass over a mid task: go up/down from the planned
    // dock without an outward stub (stubs looked like detached jogs).
    if (toSide === "left" || toSide === "right") {
      candidates.unshift(
        dedupePoints([
          from,
          { x: from.x, y: bottomClearY },
          { x: to.x, y: bottomClearY },
          to,
        ]),
      );
      candidates.unshift(
        dedupePoints([
          from,
          { x: from.x, y: topClearY },
          { x: to.x, y: topClearY },
          to,
        ]),
      );
    }
  }

  if (toSide === "right" || toSide === "left") {
    const bypassX = backwardBypassX(from, to, toSide, target, source);
    candidates.push(
      dedupePoints([
        from,
        { x: bypassX, y: from.y },
        { x: bypassX, y: to.y },
        to,
      ]),
    );
  }

  if (fromSide === "top") {
    candidates.push(
      dedupePoints([
        from,
        { x: from.x, y: Math.min(from.y, to.y) - CHANNEL_GAP },
        { x: to.x, y: Math.min(from.y, to.y) - CHANNEL_GAP },
        to,
      ]),
    );
  }

  // Channel just to the right of target, then into right dock.
  if (toSide === "right") {
    const x = target.x + target.width + CHANNEL_GAP;
    candidates.push(
      dedupePoints([
        from,
        { x, y: from.y },
        { x, y: to.y },
        to,
      ]),
    );
  }

  for (const candidate of candidates) {
    if (candidate.length < 2) continue;
    const last = candidate[candidate.length - 1]!;
    if (!approx(last.x, to.x) || !approx(last.y, to.y)) continue;
    const hitsOther = pathHitsObstacle(candidate, ignoreOthers, boundsById);
    const enters = pathEntersNodeInterior(candidate, boundsById);
    if (!hitsOther && !enters) return candidate;
  }

  // Only if nothing reaches the planned dock: allow alternate docks
  // (top/bottom clear channels). Still prefer ending near the target.
  for (const candidate of candidates) {
    if (candidate.length < 2) continue;
    const hitsOther = pathHitsObstacle(candidate, ignoreOthers, boundsById);
    const enters = pathEntersNodeInterior(candidate, boundsById);
    if (!hitsOther && !enters) return candidate;
  }

  // Prefer the shortest candidate that still ends at the planned dock.
  const scored = candidates
    .filter((c) => {
      if (c.length < 2) return false;
      const last = c[c.length - 1]!;
      return approx(last.x, to.x) && approx(last.y, to.y);
    })
    .map((c) => {
      const length = c.reduce((sum, p, i) => {
        if (i === 0) return 0;
        const prev = c[i - 1]!;
        return sum + Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
      }, 0);
      return { c, length };
    })
    .sort((a, b) => a.length - b.length);

  return scored[0]?.c ?? points;
}

function slotRatios(count: number): number[] {
  if (count <= 1) return [0.5];
  if (count === 2) return [0.22, 0.78];
  if (count === 3) return [0.18, 0.5, 0.82];
  return Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));
}

/**
 * Build orthogonal waypoints for all edges, spreading docks when several
 * flows share the same node side, and bypassing nodes when needed.
 */
export function routeOrthogonalEdges(
  edges: EdgeRouteInput[],
  boundsById: Map<string, Bounds>,
): Map<string, Point[]> {
  type Planned = {
    id: string;
    sourceId: string;
    targetId: string;
    sourceAttachedToId?: string;
    fromSide: Side;
    toSide: Side;
  };

  const planned: Planned[] = [];

  for (const edge of edges) {
    const source = boundsById.get(edge.sourceId);
    const target = boundsById.get(edge.targetId);
    if (!source || !target) continue;

    const [fromSide, toSide] = chooseSides(source, target, {
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      boundsById,
    });

    planned.push({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      sourceAttachedToId: edge.sourceAttachedToId,
      fromSide,
      toSide,
    });
  }

  assignCompassFanOut(planned, boundsById);

  const sorted = [...planned].sort((a, b) => a.id.localeCompare(b.id));
  const sourceGroups = new Map<string, Planned[]>();
  const targetGroups = new Map<string, Planned[]>();

  for (const edge of sorted) {
    const sk = `${edge.sourceId}:${edge.fromSide}`;
    const tk = `${edge.targetId}:${edge.toSide}`;
    if (!sourceGroups.has(sk)) sourceGroups.set(sk, []);
    if (!targetGroups.has(tk)) targetGroups.set(tk, []);
    sourceGroups.get(sk)!.push(edge);
    targetGroups.get(tk)!.push(edge);
  }

  const sourceRatio = new Map<string, number>();
  const targetRatio = new Map<string, number>();
  const channelOffset = new Map<string, number>();

  for (const [, group] of sourceGroups) {
    // Sort by target height so upper targets get upper docks on the
    // right face (Yes above No) — id-sort alone inverted Yes/No.
    const ranked = [...group].sort((a, b) => {
      const ta = center(boundsById.get(a.targetId)!);
      const tb = center(boundsById.get(b.targetId)!);
      const d = ta.y - tb.y;
      if (Math.abs(d) > 1) return d;
      return a.id.localeCompare(b.id);
    });
    const ratios = slotRatios(ranked.length);
    ranked.forEach((edge, index) => {
      sourceRatio.set(edge.id, ratios[index] ?? 0.5);
    });
  }

  for (const [, group] of targetGroups) {
    const ranked = [...group].sort((a, b) => {
      const sa = center(boundsById.get(a.sourceId)!);
      const sb = center(boundsById.get(b.sourceId)!);
      const d = sa.y - sb.y;
      if (Math.abs(d) > 1) return d;
      return a.id.localeCompare(b.id);
    });
    const target = boundsById.get(ranked[0]!.targetId)!;
    // End events are small circles: multiple inbounds share ONE axis
    // (same left-center dock). Spreading made three separate arrowheads.
    const sharedAxis =
      ranked.length > 1 && Math.max(target.width, target.height) <= 40;
    const ratios = sharedAxis
      ? ranked.map(() => 0.5)
      : slotRatios(ranked.length);
    ranked.forEach((edge, index) => {
      targetRatio.set(edge.id, ratios[index] ?? 0.5);
      if (ranked.length > 1) {
        const mid = (ranked.length - 1) / 2;
        channelOffset.set(edge.id, Math.round((index - mid) * 18));
      }
    });
  }

  const result = new Map<string, Point[]>();

  for (const edge of planned) {
    const source = boundsById.get(edge.sourceId)!;
    const target = boundsById.get(edge.targetId)!;

    if (edge.sourceAttachedToId) {
      const attached = boundsById.get(edge.sourceAttachedToId);
      if (attached) {
        result.set(
          edge.id,
          routeBoundaryEdge(source, target, attached).map((p) => ({
            x: Math.round(p.x),
            y: Math.round(p.y),
          })),
        );
        continue;
      }
    }
    const from = dockPoint(
      source,
      edge.fromSide,
      sourceRatio.get(edge.id) ?? 0.5,
    );
    const to = dockPoint(target, edge.toSide, targetRatio.get(edge.id) ?? 0.5);

    let points = routeBetweenDocks(
      from,
      to,
      edge.fromSide,
      edge.toSide,
      source,
      target,
      channelOffset.get(edge.id) ?? 0,
    );
    points = avoidObstacles(
      points,
      from,
      to,
      edge.fromSide,
      edge.toSide,
      source,
      target,
      edge.sourceId,
      edge.targetId,
      boundsById,
    );

    result.set(
      edge.id,
      points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
    );
  }

  return result;
}
