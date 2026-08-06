import { convert } from "../src/index";
import {
  gatewayFanoutJogs,
  sharedEndDualIncoming,
  gatewayLongLabel,
  gatewayMultiToSameEnd,
  gatewayYesNoCross,
  gatewayJoinBypassTop,
  parallelSplitJoin,
} from "../fixtures/models";
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

function firstSegmentIsVertical(
  pts: { x: number; y: number }[],
): boolean {
  if (pts.length < 2) return false;
  return Math.abs(pts[0]!.x - pts[1]!.x) < 1;
}

function segmentsCross(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  const orient = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    r: { x: number; y: number },
  ) => Math.sign((q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y));

  const o1 = orient(a1, a2, b1);
  const o2 = orient(a1, a2, b2);
  const o3 = orient(b1, b2, a1);
  const o4 = orient(b1, b2, a2);
  if (o1 === 0 || o2 === 0 || o3 === 0 || o4 === 0) return false;
  return o1 !== o2 && o3 !== o4;
}

function edgesCrossNearGateway(
  a: { x: number; y: number }[],
  b: { x: number; y: number }[],
): boolean {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsCross(a[i - 1]!, a[i]!, b[j - 1]!, b[j]!)) return true;
    }
  }
  return false;
}

describe("gatewayFanoutJogs", () => {
  it("leaves Hold/Reject from top/bottom vertices, not right-face stubs", async () => {
    const xml = await convert(gatewayFanoutJogs);
    const bounds = parseBounds(xml);
    const gw = bounds.get("GW_Decision")!;
    const hold = parseEdge(xml, "E_Hold");
    const reject = parseEdge(xml, "E_Reject");
    const accept = parseEdge(xml, "E_Accept");

    expect(hold.length).toBeGreaterThanOrEqual(2);
    expect(reject.length).toBeGreaterThanOrEqual(2);
    expect(accept.length).toBeGreaterThanOrEqual(2);

    // Top / bottom exits: first waypoint on top or bottom edge of diamond.
    const holdStart = hold[0]!;
    const rejectStart = reject[0]!;
    expect(Math.abs(holdStart.y - gw.y)).toBeLessThan(2);
    expect(Math.abs(rejectStart.y - (gw.y + gw.height))).toBeLessThan(2);
    expect(firstSegmentIsVertical(hold)).toBe(true);
    expect(firstSegmentIsVertical(reject)).toBe(true);

    // Middle Accept stays on the right face.
    expect(Math.abs(accept[0]!.x - (gw.x + gw.width))).toBeLessThan(2);
  });
});

describe("sharedEndDualIncoming", () => {
  it("shares one axis into the End (not stacked tips)", async () => {
    const xml = await convert(sharedEndDualIncoming);
    const e3 = parseEdge(xml, "E3");
    const e4 = parseEdge(xml, "E4");
    const d1 = e3[e3.length - 1]!;
    const d2 = e4[e4.length - 1]!;
    expect(Math.hypot(d1.x - d2.x, d1.y - d2.y)).toBeLessThan(1);
  });
});

describe("gatewayLongLabel", () => {
  it("emits a wide BPMNLabel left of the diamond and keeps No as a clean L", async () => {
    const xml = await convert(gatewayLongLabel);
    const bounds = parseBounds(xml);
    const gw = bounds.get("GW_Long")!;
    const no = parseEdge(xml, "E_No");

    expect(xml).toContain("<bpmndi:BPMNLabel>");
    const label = xml.match(
      /bpmnElement="GW_Long"[\s\S]*?<bpmndi:BPMNLabel>[\s\S]*?<dc:Bounds x="([^"]+)"[^>]*width="([^"]+)"/,
    );
    expect(label).toBeTruthy();
    expect(Number(label![2])).toBeGreaterThanOrEqual(100);
    // Label may start left of the diamond but must clear the bottom vertex.
    expect(Number(label![1]) + Number(label![2])).toBeLessThanOrEqual(
      gw.x + gw.width / 2 - 4,
    );

    expect(Math.abs(no[0]!.y - (gw.y + gw.height))).toBeLessThan(2);
    expect(no.length).toBeLessThanOrEqual(3);
  });
});

describe("processPayable shared end", () => {
  it("No / Rejected / Timeout share one left-center axis into the End", async () => {
    const { processPayable } = await import("../fixtures/models/process-payable");
    const xml = await convert(processPayable);
    const bounds = parseBounds(xml);
    const end = bounds.get("End_TimeoutOrReject")!;
    const docks = ["Flow_Prelim_No", "Flow_Await_Rejected", "Flow_Await_Timeout"].map(
      (id) => {
        const pts = parseEdge(xml, id);
        return pts[pts.length - 1]!;
      },
    );

    for (const d of docks) {
      expect(Math.abs(d.x - end.x)).toBeLessThan(2);
      // Same horizontal axis through the end center — not three stacked tips.
      expect(Math.abs(d.y - (end.y + end.height / 2))).toBeLessThan(2);
    }
  });
});

describe("gatewayMultiToSameEnd", () => {
  it("Rejected and Timeout converge on the same End axis", async () => {
    const xml = await convert(gatewayMultiToSameEnd);
    const rejected = parseEdge(xml, "E_Rejected");
    const timeout = parseEdge(xml, "E_Timeout");
    const rLast = rejected[rejected.length - 1]!;
    const tLast = timeout[timeout.length - 1]!;
    expect(Math.abs(rLast.x - tLast.x)).toBeLessThan(2);
    expect(Math.abs(rLast.y - tLast.y)).toBeLessThan(2);
  });
});

describe("gatewayYesNoCross", () => {
  it("Yes leaves right vertex, No leaves bottom vertex (no floating docks)", async () => {
    const xml = await convert(gatewayYesNoCross);
    const bounds = parseBounds(xml);
    const gw = bounds.get("GW_Prelim")!;
    const yes = parseEdge(xml, "E_Yes");
    const no = parseEdge(xml, "E_No");

    expect(Math.abs(yes[0]!.x - (gw.x + gw.width))).toBeLessThan(2);
    expect(Math.abs(yes[0]!.y - (gw.y + gw.height / 2))).toBeLessThan(2);
    expect(Math.abs(no[0]!.y - (gw.y + gw.height))).toBeLessThan(2);
    expect(Math.abs(no[0]!.x - (gw.x + gw.width / 2))).toBeLessThan(2);
    // Clean L: no midX jog off the bottom vertex.
    expect(no.length).toBeLessThanOrEqual(3);
    expect(edgesCrossNearGateway(yes, no)).toBe(false);
  });
});

describe("gatewayJoinBypassTop", () => {
  it("NO uses clean top→top arch over Approve (no stub jog)", async () => {
    const xml = await convert(gatewayJoinBypassTop);
    const bounds = parseBounds(xml);
    const split = bounds.get("GW_Split")!;
    const join = bounds.get("GW_Join")!;
    const approve = bounds.get("Task_Approve")!;
    const no = parseEdge(xml, "E_No");
    const fromApprove = parseEdge(xml, "E3");

    const noLast = no[no.length - 1]!;
    const approveLast = fromApprove[fromApprove.length - 1]!;

    expect(Math.abs(no[0]!.y - split.y)).toBeLessThan(2);
    expect(Math.abs(no[0]!.x - (split.x + split.width / 2))).toBeLessThan(2);
    expect(Math.abs(noLast.y - join.y)).toBeLessThan(2);
    expect(Math.abs(approveLast.x - join.x)).toBeLessThan(2);

    // First segment goes straight up — no horizontal stub.
    expect(Math.abs(no[0]!.x - no[1]!.x)).toBeLessThan(1);
    expect(no[1]!.y).toBeLessThan(no[0]!.y);

    const minY = Math.min(...no.map((p) => p.y));
    expect(minY).toBeLessThan(approve.y - 8);
  });
});

describe("parallelSplitJoin layout", () => {
  it("Path B uses bottom vertices on Split and Join", async () => {
    const xml = await convert(parallelSplitJoin);
    const bounds = parseBounds(xml);
    const split = bounds.get("GW_Split")!;
    const join = bounds.get("GW_Join")!;
    const toB = parseEdge(xml, "E3");
    const fromB = parseEdge(xml, "E5");
    const toA = parseEdge(xml, "E2");

    expect(Math.abs(toB[0]!.y - (split.y + split.height))).toBeLessThan(2);
    expect(Math.abs(toB[0]!.x - (split.x + split.width / 2))).toBeLessThan(2);
    expect(Math.abs(fromB[fromB.length - 1]!.y - (join.y + join.height))).toBeLessThan(
      2,
    );

    expect(Math.abs(toA[0]!.y - (split.y + split.height / 2))).toBeLessThan(2);
    expect(toA.length).toBeLessThanOrEqual(3);
  });
});
