import { convert } from "../src/index";
import { advancedOrder } from "../fixtures/models";
import { describe, it, expect } from "vitest";

function parseBounds(xml: string) {
  const map = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();
  const re =
    /bpmnElement="([^"]+)"[^>]*>\s*<dc:Bounds x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g;
  for (const m of xml.matchAll(re)) {
    map.set(m[1]!, {
      x: Number(m[2]),
      y: Number(m[3]),
      width: Number(m[4]),
      height: Number(m[5]),
    });
  }
  return map;
}

function parseEdge(xml: string, id: string) {
  const m = xml.match(
    new RegExp(`id="${id}_di"[\\s\\S]*?</bpmndi:BPMNEdge>`),
  );
  if (!m) return [];
  return [...m[0].matchAll(/x="([^"]+)" y="([^"]+)"/g)].map((p) => ({
    x: Number(p[1]),
    y: Number(p[2]),
  }));
}

function pointInside(
  p: { x: number; y: number },
  b: { x: number; y: number; width: number; height: number },
  pad = 2,
) {
  return (
    p.x > b.x + pad &&
    p.x < b.x + b.width - pad &&
    p.y > b.y + pad &&
    p.y < b.y + b.height - pad
  );
}

describe("advancedOrder layout regression", () => {
  it("keeps happy-path tasks left-to-right without stacking", async () => {
    const xml = await convert(advancedOrder);
    const bounds = parseBounds(xml);

    const create = bounds.get("Task_CreateOrder")!;
    const payment = bounds.get("Task_Payment")!;
    const gateway = bounds.get("Gateway_Paid")!;
    const retry = bounds.get("Task_RetryPayment")!;
    const pack = bounds.get("Task_Pack")!;
    const notify = bounds.get("Task_Notify")!;
    const delivery = bounds.get("Task_Delivery")!;
    const success = bounds.get("End_Success")!;

    // Happy path must progress left → right across lanes.
    expect(create.x).toBeLessThan(payment.x);
    expect(payment.x).toBeLessThan(gateway.x);
    expect(gateway.x).toBeLessThan(pack.x);
    expect(pack.x).toBeLessThan(delivery.x);
    expect(delivery.x).toBeLessThan(notify.x);
    expect(notify.x).toBeLessThan(success.x);

    // Exclusive fan-out: Retry (up-lane) must not share Pack's column.
    expect(Math.abs(retry.x - pack.x)).toBeGreaterThan(40);

    // Deliver should not stick to the External Service lane ceiling
    // (System lane ends around Pack bottom; leave a visible gap).
    const packBottom = pack.y + pack.height;
    expect(delivery.y - packBottom).toBeGreaterThan(24);

    // Payment must not sit under Create (merge target of the retry loop).
    expect(Math.abs(payment.x - create.x)).toBeGreaterThan(40);

    // Create and Retry should not fully overlap.
    const overlapY =
      Math.min(create.y + create.height, retry.y + retry.height) -
      Math.max(create.y, retry.y);
    const sameColumn = Math.abs(create.x - retry.x) < 30;
    if (sameColumn) {
      expect(overlapY).toBeLessThanOrEqual(0);
    }

    for (const edgeId of ["F2", "F5", "F7", "F9"]) {
      const pts = parseEdge(xml, edgeId);
      expect(pts.length).toBeGreaterThanOrEqual(2);

      // No overshoot stubs (last segment reversing along the same axis).
      if (pts.length >= 3) {
        const a = pts[pts.length - 3]!;
        const b = pts[pts.length - 2]!;
        const c = pts[pts.length - 1]!;
        const collinearX = Math.abs(a.x - b.x) < 1 && Math.abs(b.x - c.x) < 1;
        const collinearY = Math.abs(a.y - b.y) < 1 && Math.abs(b.y - c.y) < 1;
        if (collinearX) {
          const ab = b.y - a.y;
          const bc = c.y - b.y;
          expect(ab * bc).toBeGreaterThanOrEqual(0);
        }
        if (collinearY) {
          const ab = b.x - a.x;
          const bc = c.x - b.x;
          expect(ab * bc).toBeGreaterThanOrEqual(0);
        }
      }

      // Intermediate waypoints must not sit inside unrelated tasks.
      const blockers = [pack, notify, delivery, payment, retry, create];
      for (const p of pts.slice(1, -1)) {
        for (const b of blockers) {
          expect(pointInside(p, b)).toBe(false);
        }
      }
    }

    // Pack → Deliver must not backtrack left around a stacked Notify.
    const f5 = parseEdge(xml, "F5");
    const packRight = pack.x + pack.width;
    expect(f5.every((p) => p.x >= packRight - 1)).toBe(true);
  });
});
