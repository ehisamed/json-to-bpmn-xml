type Bounds = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type Side = "left" | "right" | "top" | "bottom";

export type EdgeRouteInput = {
  id: string;
  sourceId: string;
  targetId: string;
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
  const r = Math.min(0.85, Math.max(0.15, ratio));

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
  if (dx > 0 && dx <= 220 && Math.abs(dy) <= 120) {
    return ["right", "left"];
  }

  if (dx > 0 && dy < -band) {
    // Long upward-forward skips enter the target from the top
    // (avoids a leftover left-dock jog into the end event).
    return dx > 180 ? ["top", "top"] : ["top", "left"];
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

function routeBetweenDocks(
  from: Point,
  to: Point,
  fromSide: Side,
  toSide: Side,
  source: Bounds,
  target: Bounds,
): Point[] {
  if (approx(from.y, to.y) || approx(from.x, to.x)) {
    return dedupePoints([from, to]);
  }

  const fromHorizontal = fromSide === "left" || fromSide === "right";
  const toHorizontal = toSide === "left" || toSide === "right";

  if (fromHorizontal && toHorizontal) {
    if (to.x >= from.x - 2) {
      if (Math.abs(from.y - to.y) <= 16) {
        const y = to.y;
        return dedupePoints([
          { x: from.x, y },
          { x: to.x, y },
        ]);
      }

      const midX = Math.round((from.x + to.x) / 2);
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
    // Ensure vertical column stays outside target when entering a side.
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

  const midX = Math.round((from.x + to.x) / 2);
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
    const hitsOther = pathHitsObstacle(candidate, ignoreOthers, boundsById);
    const enters = pathEntersNodeInterior(candidate, boundsById);
    if (!hitsOther && !enters) return candidate;
  }

  // Prefer the shortest valid-looking clear channel even if slightly dirty.
  const scored = candidates
    .filter((c) => c.length >= 2)
    .map((c) => {
      const length = c.reduce((sum, p, i) => {
        if (i === 0) return 0;
        const prev = c[i - 1]!;
        return sum + Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
      }, 0);
      return { c, length };
    })
    .sort((a, b) => a.length - b.length);

  return scored[0]?.c ?? candidates[0] ?? points;
}

function slotRatios(count: number): number[] {
  if (count <= 1) return [0.5];
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
      fromSide,
      toSide,
    });
  }

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

  for (const [, group] of sourceGroups) {
    const ratios = slotRatios(group.length);
    group.forEach((edge, index) => {
      sourceRatio.set(edge.id, ratios[index] ?? 0.5);
    });
  }

  for (const [, group] of targetGroups) {
    const ratios = slotRatios(group.length);
    group.forEach((edge, index) => {
      targetRatio.set(edge.id, ratios[index] ?? 0.5);
    });
  }

  const result = new Map<string, Point[]>();

  for (const edge of planned) {
    const source = boundsById.get(edge.sourceId)!;
    const target = boundsById.get(edge.targetId)!;
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
