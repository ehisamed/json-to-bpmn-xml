import { describe, it, expect } from "vitest";
import {
  chooseSides,
  routeOrthogonalEdges,
} from "../src/utils/edge-router";

describe("edge-router", () => {
  it("uses side docks for forward cross-lane links", () => {
    const source = { x: 100, y: 100, width: 100, height: 80 };
    const target = { x: 280, y: 360, width: 100, height: 80 };

    expect(chooseSides(source, target)).toEqual(["right", "left"]);
  });

  it("uses side docks for upward-forward joins (avoids right-dock collision)", () => {
    const source = { x: 200, y: 300, width: 50, height: 50 };
    const target = { x: 300, y: 100, width: 100, height: 80 };

    expect(chooseSides(source, target)).toEqual(["right", "left"]);
  });

  it("routes parallel Path B into the Join, not onto Join→End", () => {
    const bounds = new Map([
      ["split", { x: 200, y: 35, width: 50, height: 50 }],
      ["a", { x: 318, y: 20, width: 100, height: 80 }],
      ["b", { x: 318, y: 152, width: 100, height: 80 }],
      ["join", { x: 528, y: 35, width: 50, height: 50 }],
      ["end", { x: 688, y: 42, width: 36, height: 36 }],
    ]);

    const routes = routeOrthogonalEdges(
      [
        { id: "e4", sourceId: "a", targetId: "join" },
        { id: "e5", sourceId: "b", targetId: "join" },
        { id: "e6", sourceId: "join", targetId: "end" },
      ],
      bounds,
    );

    const e5 = routes.get("e5")!;
    const e6 = routes.get("e6")!;
    const join = bounds.get("join")!;
    const last = e5[e5.length - 1]!;
    const e6First = e6[0]!;

    // Enter join from left or bottom — never share the right dock with e6.
    const onLeft = Math.abs(last.x - join.x) < 1;
    const onBottom = Math.abs(last.y - (join.y + join.height)) < 1;
    expect(onLeft || onBottom).toBe(true);
    expect(last.x === e6First.x && last.y === e6First.y).toBe(false);
  });

  it("uses top/bottom when movement is mostly vertical in same column", () => {
    const source = { x: 200, y: 300, width: 50, height: 50 };
    const target = { x: 205, y: 100, width: 50, height: 50 };

    expect(chooseSides(source, target)).toEqual(["top", "bottom"]);
  });

  it("exits left when a node sits directly below on a backward loop", () => {
    const bounds = new Map([
      ["retry", { x: 300, y: 100, width: 100, height: 80 }],
      ["pack", { x: 300, y: 300, width: 100, height: 80 }],
      ["pay", { x: 100, y: 500, width: 100, height: 80 }],
    ]);

    const sides = chooseSides(bounds.get("retry")!, bounds.get("pay")!, {
      sourceId: "retry",
      targetId: "pay",
      boundsById: bounds,
    });

    expect(sides).toEqual(["left", "right"]);
  });

  it("builds orthogonal waypoints and avoids nodes under a loop", () => {
    const bounds = new Map([
      ["retry", { x: 300, y: 100, width: 100, height: 80 }],
      ["pack", { x: 300, y: 300, width: 100, height: 80 }],
      ["pay", { x: 100, y: 500, width: 100, height: 80 }],
    ]);

    const routes = routeOrthogonalEdges(
      [{ id: "loop", sourceId: "retry", targetId: "pay" }],
      bounds,
    );

    const points = routes.get("loop")!;
    expect(points.length).toBeGreaterThanOrEqual(2);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const cur = points[i]!;
      const ortho =
        Math.abs(prev.x - cur.x) < 0.5 || Math.abs(prev.y - cur.y) < 0.5;
      expect(ortho).toBe(true);
    }

    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      if (Math.abs(a.x - b.x) < 0.5) {
        const x = a.x;
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        const crossesPack =
          x >= 300 && x <= 400 && minY < 380 && maxY > 300;
        expect(crossesPack).toBe(false);
      }
    }

    const pay = bounds.get("pay")!;
    const last = points[points.length - 1]!;
    const prev = points[points.length - 2]!;
    expect(last.x).toBe(pay.x + pay.width);
    expect(prev.x).toBeGreaterThanOrEqual(pay.x + pay.width);
  });

  it("does not route a vertical channel through the payment node", () => {
    const bounds = new Map([
      ["retry", { x: 968, y: 140, width: 100, height: 80 }],
      ["pack", { x: 968, y: 340, width: 100, height: 80 }],
      ["pay", { x: 618, y: 540, width: 100, height: 80 }],
    ]);

    const routes = routeOrthogonalEdges(
      [{ id: "F9", sourceId: "retry", targetId: "pay" }],
      bounds,
    );

    const points = routes.get("F9")!;
    const pay = bounds.get("pay")!;

    for (const p of points.slice(0, -1)) {
      const inside =
        p.x > pay.x + 1 &&
        p.x < pay.x + pay.width - 1 &&
        p.y > pay.y + 1 &&
        p.y < pay.y + pay.height - 1;
      expect(inside).toBe(false);
    }

    const last = points[points.length - 1]!;
    expect(last.x).toBe(pay.x + pay.width);
  });

  it("shares one axis into a small End (not stacked tips)", () => {
    const bounds = new Map([
      ["a", { x: 0, y: 0, width: 100, height: 80 }],
      ["b", { x: 0, y: 200, width: 100, height: 80 }],
      ["end", { x: 250, y: 100, width: 36, height: 36 }],
    ]);

    const routes = routeOrthogonalEdges(
      [
        { id: "e1", sourceId: "a", targetId: "end" },
        { id: "e2", sourceId: "b", targetId: "end" },
      ],
      bounds,
    );

    const e1 = routes.get("e1")!;
    const e2 = routes.get("e2")!;
    const last1 = e1[e1.length - 1]!;
    const last2 = e2[e2.length - 1]!;
    expect(Math.abs(last1.x - last2.x)).toBeLessThan(1);
    expect(Math.abs(last1.y - last2.y)).toBeLessThan(1);
    expect(Math.abs(last1.y - (100 + 18))).toBeLessThan(1);
  });

  it("spreads shared source docks", () => {
    const bounds = new Map([
      ["a", { x: 0, y: 0, width: 100, height: 80 }],
      ["b", { x: 200, y: 0, width: 100, height: 80 }],
      ["c", { x: 200, y: 200, width: 100, height: 80 }],
    ]);

    const routes = routeOrthogonalEdges(
      [
        { id: "e1", sourceId: "a", targetId: "b" },
        { id: "e2", sourceId: "a", targetId: "c" },
      ],
      bounds,
    );

    const e1 = routes.get("e1")!;
    const e2 = routes.get("e2")!;
    expect(e1[0]!.y).not.toBe(e2[0]!.y);
  });
});
