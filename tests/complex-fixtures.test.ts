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
  extendedEvents,
  activityTypes,
  dataObjects,
  artifacts,
  advancedSubprocesses,
  controlEvents,
  complexGatewayLoops,
  compensation,
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
  { name: "extendedEvents", model: extendedEvents },
  { name: "activityTypes", model: activityTypes },
  { name: "dataObjects", model: dataObjects },
  { name: "artifacts", model: artifacts },
  { name: "advancedSubprocesses", model: advancedSubprocesses },
  { name: "controlEvents", model: controlEvents },
  { name: "complexGatewayLoops", model: complexGatewayLoops },
  { name: "compensation", model: compensation },
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
    expect(xml).toContain('bpmnElement="Verify" isExpanded="true"');
    expect(xml).toContain('bpmnElement="VerifyStart"');
    expect(xml).toContain('bpmnElement="VerifyFlow_1"');
  });

  it("emits extended event definitions", async () => {
    const xml = await convert(extendedEvents);
    expect(xml).toContain("<bpmn:signalEventDefinition");
    expect(xml).toContain("<bpmn:conditionalEventDefinition");
    expect(xml).toContain("<bpmn:errorEventDefinition");
    expect(xml).toContain("<bpmn:escalationEventDefinition");
    expect(xml).toContain("<bpmn:terminateEventDefinition");
  });

  it("emits the supported specialized activity types", async () => {
    const xml = await convert(activityTypes);
    expect(xml).toContain("<bpmn:manualTask");
    expect(xml).toContain('implementation="email"');
    expect(xml).toContain("<bpmn:receiveTask");
    expect(xml).toContain('<bpmn:scriptTask id="Script"');
    expect(xml).toContain('scriptFormat="javascript"');
    expect(xml).toContain("return order.weight * rate;");
    expect(xml).toContain("<bpmn:businessRuleTask");
    expect(xml).toContain('<bpmn:callActivity id="Call"');
    expect(xml).toContain('calledElement="CreateShipmentProcess"');
  });

  it("emits data object references and input/output associations", async () => {
    const xml = await convert(dataObjects);
    expect(xml).toContain('<bpmn:dataObjectReference id="InvoiceDocument"');
    expect(xml).toContain('name="Validated invoice"');
    expect(xml).toContain('id="DataObjectOutput_Receive_InvoiceDocument"');
    expect(xml).toContain('id="DataObjectInput_Validate_InvoiceDocument"');
    expect(xml).toContain("<bpmn:targetRef>InvoiceDocument</bpmn:targetRef>");
    expect(xml).toContain("<bpmn:sourceRef>InvoiceDocument</bpmn:sourceRef>");
    expect(xml).toMatch(
      /bpmnElement="InvoiceDocument"[\s\S]*?<dc:Bounds[^>]*width="50" height="50"/,
    );
  });

  it("emits text annotations, groups, and associations", async () => {
    const xml = await convert(artifacts);
    expect(xml).toContain('<bpmn:textAnnotation id="Note_Compliance"');
    expect(xml).toContain("Manual compliance review is required");
    expect(xml).toContain('<bpmn:group id="Group_Review"');
    expect(xml).toContain('<bpmn:association id="Association_Note"');
    expect(xml).toContain('sourceRef="Approve"');
    expect(xml).toContain('targetRef="Note_Compliance"');
    expect(xml).toMatch(/bpmnElement="Note_Compliance"[\s\S]*?<dc:Bounds/);
  });

  it("emits event and transaction subprocesses", async () => {
    const xml = await convert(advancedSubprocesses);
    expect(xml).toContain('<bpmn:transaction id="FulfillTransaction"');
    expect(xml).toContain('triggeredByEvent="true"');
    expect(xml).toContain('<bpmn:subProcess id="RecoveryEvents"');
    expect(xml).toContain('<bpmn:startEvent id="RecoveryStart"');
    expect(xml).toContain('<bpmn:errorEventDefinition');
    expect(xml).toContain('bpmnElement="FulfillTransaction" isExpanded="true"');
    expect(xml).toContain('bpmnElement="RecoveryEvents" isExpanded="true"');
  });

  it("emits cancel, compensation, and link event definitions", async () => {
    const xml = await convert(controlEvents);
    expect(xml).toContain("<bpmn:cancelEventDefinition");
    expect(xml).toContain("<bpmn:compensateEventDefinition");
    expect(xml).toContain("<bpmn:linkEventDefinition");
    expect(xml).toContain('<bpmn:intermediateCatchEvent id="MultipleWait"');
    expect(xml).toContain('id="MultipleWait_timerDef_1"');
    expect(xml).toContain('id="MultipleWait_messageDef_2"');
  });

  it("emits complex gateways and advanced loop characteristics", async () => {
    const xml = await convert(complexGatewayLoops);
    expect(xml).toContain('<bpmn:complexGateway id="Split"');
    expect(xml).toContain('isMarkerVisible="true"');
    expect(xml).toContain('<bpmn:multiInstanceLoopCharacteristics behavior="Complex"');
    expect(xml).toContain("<bpmn:loopCardinality xsi:type=\"bpmn:tFormalExpression\">3</bpmn:loopCardinality>");
    expect(xml).toContain("<bpmn:completionCondition xsi:type=\"bpmn:tFormalExpression\">approved &gt;= 2</bpmn:completionCondition>");
  });

  it("emits compensation activityRef and waitForCompletion", async () => {
    const xml = await convert(compensation);
    expect(xml).toContain('<bpmn:compensateEventDefinition id="Compensate_compensationDef" waitForCompletion="false"');
    expect(xml).toContain('activityRef="UndoCharge"');
    expect(xml).toContain('attachedToRef="ChargeCard"');
  });
});
