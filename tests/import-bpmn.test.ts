import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { convert, importBpmn } from "../src/index";
import * as fixtureExports from "../fixtures/models";
import { messageSignalReferences } from "../fixtures/models/message-signal-references";
import { advancedSubprocesses } from "../fixtures/models/advanced-subprocesses";
import { accountsPayable } from "../fixtures/models/accounts-payable";
import { dataObjects } from "../fixtures/models/data-objects";
import { artifacts } from "../fixtures/models/artifacts";
import { subprocessAndMultiInstance } from "../fixtures/models/subprocess-and-multi-instance";
import type { ProcessModel } from "../src/types/process";

function isProcessModel(value: unknown): value is ProcessModel {
  return !!value && typeof value === "object" && typeof (value as ProcessModel).id === "string" &&
    (Array.isArray((value as ProcessModel).nodes) || Array.isArray((value as ProcessModel).processes));
}

const fixtures = Object.entries(fixtureExports).filter((entry): entry is [string, ProcessModel] => isProcessModel(entry[1]));

describe("BPMN XML import", () => {
  for (const [name, fixture] of fixtures) {
    it(`imports and re-exports ${name}`, async () => {
      const xml = await convert(fixture);
      const result = await importBpmn(xml);
      expect(result.sourceXml).toBe(xml);
      expect(result.model).not.toBeNull();
      expect(result.warnings.filter((warning) => warning.code === "parse")).toEqual([]);
      expect(result.warnings.filter((warning) => warning.code !== "diagram-rebuilt")).toEqual([]);
      await expect(convert(result.model!)).resolves.toContain("<bpmn:definitions");
    });
  }

  it("rejects malformed XML", async () => {
    await expect(importBpmn("<bpmn:definitions>")).rejects.toThrow();
  });

  it("omits unsupported nodes, dependent boundaries and flows without changing the original XML", async () => {
    const xml = await readFile(new URL("../fixtures/xml/unsupported-ad-hoc.bpmn", import.meta.url), "utf8");
    const result = await importBpmn(xml);
    expect(result.sourceXml).toBe(xml);
    expect(result.model?.nodes?.map((node) => node.id)).toEqual(["Start", "End"]);
    expect(result.model?.edges?.map((edge) => edge.id)).toEqual(["Flow_Direct"]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "unsupported", elementId: "AdHoc" }),
      expect.objectContaining({ code: "missing-reference", elementId: "Boundary" }),
      expect.objectContaining({ code: "dropped-flow", elementId: "Flow_To_AdHoc" }),
    ]));
    await expect(convert(result.model!)).resolves.toContain('id="Flow_Direct"');
  });

  it("returns null for a process containing only unsupported nodes", async () => {
    const xml = `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="OnlyUnsupported" targetNamespace="test"><bpmn:process id="Process"><bpmn:adHocSubProcess id="AdHoc" /></bpmn:process></bpmn:definitions>`;
    const result = await importBpmn(xml);
    expect(result.model).toBeNull();
    expect(result.sourceXml).toBe(xml);
    expect(result.warnings.some((warning) => warning.elementId === "AdHoc")).toBe(true);
  });

  it("restores collaboration references and message flows", async () => {
    const result = await importBpmn(await convert(messageSignalReferences));
    expect(result.model?.messages).toEqual(messageSignalReferences.messages);
    expect(result.model?.signals).toEqual(messageSignalReferences.signals);
    expect(result.model?.processes?.map((process) => process.id)).toEqual(["Process_Sales", "Process_Fulfillment"]);
    expect(result.model?.messageFlows).toEqual(messageSignalReferences.messageFlows);
    const salesStart = result.model?.processes?.[0]?.nodes.find((node) => node.id === "SalesStart");
    expect(salesStart?.eventDefinitionOptions?.messageRef).toBe("Message_OrderSubmitted");
  });

  it("restores nested transaction and event subprocesses", async () => {
    const result = await importBpmn(await convert(advancedSubprocesses));
    const transaction = result.model?.nodes?.find((node) => node.id === "FulfillTransaction");
    const recovery = result.model?.nodes?.find((node) => node.id === "RecoveryEvents");
    expect(transaction?.subProcess?.subProcessType).toBe("transaction");
    expect(transaction?.subProcess?.expanded).toBe(true);
    expect(transaction?.subProcess?.nodes.map((node) => node.id)).toEqual(["TxStart", "ReserveStock", "TxEnd"]);
    expect(recovery?.subProcess?.subProcessType).toBe("event");
    expect(recovery?.subProcess?.expanded).toBe(true);
    expect(recovery?.subProcess?.interrupting).toBe(false);
  });

  it("keeps empty subprocess nodes and their connected sequence flows", async () => {
    const result = await importBpmn(await convert(subprocessAndMultiInstance));
    expect(result.model?.nodes?.find((node) => node.id === "Sub_Notify")).toMatchObject({ type: "subProcess" });
    expect(result.model?.nodes?.find((node) => node.id === "Sub_Notify")?.subProcess).toBeUndefined();
    expect(result.model?.edges).toHaveLength(subprocessAndMultiInstance.edges!.length);
  });

  it("restores data-store and data-object associations", async () => {
    const storeResult = await importBpmn(await convert(accountsPayable));
    expect(storeResult.model?.dataStores).toEqual([{ id: "DataStoreReference_05gbcij", name: "Due Invoices DB" }]);
    const storeNodes = storeResult.model?.processes?.flatMap((process) => process.nodes) ?? [];
    expect(storeNodes.find((node) => node.id === "Activity_0zmoiys")?.dataOutputs).toEqual(["DataStoreReference_05gbcij"]);
    const objectResult = await importBpmn(await convert(dataObjects));
    expect(objectResult.model?.dataObjects).toEqual(dataObjects.dataObjects);
    expect(objectResult.model?.nodes?.find((node) => node.id === "Validate")?.dataObjectInputs).toEqual(["InvoiceDocument"]);
    expect(objectResult.model?.nodes?.find((node) => node.id === "Validate")?.dataObjectOutputs).toEqual(["ValidatedInvoice"]);
  });

  it("restores annotations, groups and associations", async () => {
    const result = await importBpmn(await convert(artifacts));
    expect(result.model?.textAnnotations).toEqual(artifacts.textAnnotations);
    expect(result.model?.groups).toEqual([{ id: "Group_Review" }]);
    expect(result.model?.associations).toEqual(artifacts.associations);
  });

  it("warns about a multi-source data mapping without changing the source XML", async () => {
    const xml = (await convert(dataObjects)).replace(
      "<bpmn:sourceRef>InvoiceDocument</bpmn:sourceRef>",
      "<bpmn:sourceRef>InvoiceDocument</bpmn:sourceRef><bpmn:sourceRef>ValidatedInvoice</bpmn:sourceRef>",
    );
    const result = await importBpmn(xml);
    expect(result.sourceXml).toBe(xml);
    expect(result.model?.nodes?.find((node) => node.id === "Validate")?.dataObjectInputs).toBeUndefined();
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "unsupported", elementId: "DataObjectInput_Validate_InvoiceDocument",
    }));
    await expect(convert(result.model!)).resolves.toContain("<bpmn:definitions");
  });
});
