import { convert } from "../src/index";
import {
  accountsPayable,
  incidentResponse,
  advancedOrder,
  exclusiveFanoutUpForward,
  parallelSplitJoin,
  exclusiveThreeWay,
  timerStartSimple,
  messageStartSimple,
  subprocessAndMultiInstance,
  crossLaneSparseDrop,
  gatewayFanoutJogs,
  sharedEndDualIncoming,
  gatewayLongLabel,
  gatewayMultiToSameEnd,
  gatewayYesNoCross,
  gatewayJoinBypassTop,
  inclusiveGateway,
  embeddedSubprocess,
} from "../fixtures/models";
import { describe, it, expect } from "vitest";

const complexFixtures = [
  { name: "accountsPayable", model: accountsPayable },
  { name: "incidentResponse", model: incidentResponse },
  { name: "advancedOrder", model: advancedOrder },
] as const;

const layoutFixtures = [
  { name: "exclusiveFanoutUpForward", model: exclusiveFanoutUpForward },
  { name: "parallelSplitJoin", model: parallelSplitJoin },
  { name: "exclusiveThreeWay", model: exclusiveThreeWay },
  { name: "timerStartSimple", model: timerStartSimple },
  { name: "messageStartSimple", model: messageStartSimple },
  { name: "subprocessAndMultiInstance", model: subprocessAndMultiInstance },
  { name: "crossLaneSparseDrop", model: crossLaneSparseDrop },
  { name: "gatewayFanoutJogs", model: gatewayFanoutJogs },
  { name: "sharedEndDualIncoming", model: sharedEndDualIncoming },
  { name: "gatewayLongLabel", model: gatewayLongLabel },
  { name: "gatewayMultiToSameEnd", model: gatewayMultiToSameEnd },
  { name: "gatewayYesNoCross", model: gatewayYesNoCross },
  { name: "gatewayJoinBypassTop", model: gatewayJoinBypassTop },
  { name: "inclusiveGateway", model: inclusiveGateway },
  { name: "embeddedSubprocess", model: embeddedSubprocess },
] as const;

describe("complex fixtures", () => {
  for (const { name, model } of complexFixtures) {
    it(`converts ${name} without laneId leakage`, async () => {
      const xml = await convert(model);
      expect(xml).toContain("<?xml");
      expect(xml).toContain("<bpmn:definitions");
      expect(xml).toContain("<bpmndi:BPMNDiagram");
      expect(xml).not.toContain("laneId=");
    });
  }

  it("accountsPayable exposes collaboration features", async () => {
    const xml = await convert(accountsPayable);
    expect(xml).toContain("<bpmn:collaboration");
    expect(xml).toContain("<bpmn:messageFlow");
    expect(xml).toContain("<bpmn:eventBasedGateway");
    expect(xml).toContain("<bpmn:dataStoreReference");
  });

  it("incidentResponse uses timer start on ops", async () => {
    const xml = await convert(incidentResponse);
    expect(xml).toContain('name="Support Desk"');
    expect(xml).toContain('name="Operations"');
    expect(xml).toContain("<bpmn:timerEventDefinition");
  });
});

describe("layout case fixtures", () => {
  for (const { name, model } of layoutFixtures) {
    it(`converts ${name}`, async () => {
      const xml = await convert(model);
      expect(xml).toContain("<bpmndi:BPMNDiagram");
      expect(xml).not.toContain("laneId=");
    });
  }

  it("exclusiveFanout spreads Retry away from Continue column", async () => {
    const xml = await convert(exclusiveFanoutUpForward);
    const retry = xml.match(
      /bpmnElement="Task_Retry"[\s\S]*?<dc:Bounds x="([^"]+)"/,
    );
    const cont = xml.match(
      /bpmnElement="Task_Continue"[\s\S]*?<dc:Bounds x="([^"]+)"/,
    );
    expect(retry).toBeTruthy();
    expect(cont).toBeTruthy();
    expect(Math.abs(Number(retry![1]) - Number(cont![1]))).toBeGreaterThan(40);
  });

  it("timer and message starts emit event definitions", async () => {
    const timerXml = await convert(timerStartSimple);
    const msgXml = await convert(messageStartSimple);
    expect(timerXml).toContain("<bpmn:timerEventDefinition");
    expect(msgXml).toContain("<bpmn:messageEventDefinition");
  });

  it("exclusive gateways expose X marker in DI", async () => {
    const xml = await convert(exclusiveThreeWay);
    expect(xml).toContain("<bpmn:exclusiveGateway");
    expect(xml).toMatch(
      /bpmnElement="GW_Decision"[^>]*isMarkerVisible="true"/,
    );
  });

  it("inclusive gateways expose a visible marker in DI", async () => {
    const xml = await convert(inclusiveGateway);
    expect(xml).toContain("<bpmn:inclusiveGateway");
    expect(xml).toMatch(
      /bpmnElement="Split"[^>]*isMarkerVisible="true"/,
    );
    expect(xml).toContain("sendEmail = true");
    expect(xml).toContain("sendSms = true");
  });

  it("schedulePayments timer start has clock definition", async () => {
    const { schedulePayments } = await import("../fixtures/models");
    const xml = await convert(schedulePayments);
    expect(xml).toContain("<bpmn:timerEventDefinition");
  });

  it("subprocess and multi-instance markers are present", async () => {
    const xml = await convert(subprocessAndMultiInstance);
    expect(xml).toContain("<bpmn:subProcess");
    expect(xml).toContain("<bpmn:multiInstanceLoopCharacteristics");
  });

  it("serializes embedded subprocess flow elements", async () => {
    const xml = await convert(embeddedSubprocess);
    expect(xml).toContain('<bpmn:subProcess id="Verify"');
    expect(xml).toContain('<bpmn:startEvent id="VerifyStart"');
    expect(xml).toContain('<bpmn:serviceTask id="CheckIdentity"');
    expect(xml).toContain('<bpmn:endEvent id="VerifyEnd"');
  });
});
