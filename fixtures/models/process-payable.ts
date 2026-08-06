import type { ProcessModel } from "../../src/index";

/**
 * Process Payable pool from `diagram (9).bpmn` (Finance + CFO lanes).
 *
 * Original BPMN also includes unsupported features (omitted or approximated):
 * - intermediateCatchEvent (timer / message) → omitted; paths simplified
 * - eventBasedGateway → approximated as exclusiveGateway
 * - generic bpmn:task → serviceTask
 * - multiInstanceLoopCharacteristics → omitted
 * - dataStoreReference + data associations → omitted
 * - messageFlow from the other pool → omitted (single-process model)
 * - colors / bioc attributes → omitted
 *
 * Approximate flow kept:
 *   Start → Check Invoice → Preliminarily Approve → Approved?
 *     ├── No  → End
 *     └── Yes → Submit for Final Approval → Await Decision?
 *           ├── Timeout path → End
 *           ├── Approved path → Make Payment → End OK
 *           └── Rejected path → End
 */
export const processPayable: ProcessModel = {
  id: "Process_1",
  name: "Process Payable",

  lanes: [
    { id: "Lane_Finance", name: "Finance" },
    { id: "Lane_CFO", name: "CFO" },
  ],

  nodes: [
    {
      id: "StartEvent_1",
      type: "start",
      laneId: "Lane_Finance",
    },
    {
      id: "Activity_CheckInvoice",
      type: "userTask",
      name: "Check Invoice",
      laneId: "Lane_Finance",
    },
    {
      id: "Activity_PrelimApprove",
      type: "userTask",
      name: "Preliminarily Approve Payment",
      laneId: "Lane_CFO",
    },
    {
      id: "Gateway_PrelimApproved",
      type: "exclusiveGateway",
      name: "Prelim. approved?",
      laneId: "Lane_CFO",
    },
    {
      id: "Activity_SubmitFinal",
      // Original: bpmn:task + multiInstance
      type: "serviceTask",
      name: "Submit for Final Approval",
      laneId: "Lane_CFO",
    },
    {
      id: "Gateway_AwaitDecision",
      // Original: eventBasedGateway waiting on timer / messages
      type: "exclusiveGateway",
      name: "Await decision",
      laneId: "Lane_CFO",
    },
    {
      id: "End_TimeoutOrReject",
      type: "end",
      laneId: "Lane_CFO",
    },
    {
      id: "Activity_MakePayment",
      type: "serviceTask",
      name: "Make Payment",
      laneId: "Lane_CFO",
    },
    {
      id: "End_OK",
      type: "end",
      name: "OK",
      laneId: "Lane_CFO",
    },
  ],

  edges: [
    {
      id: "Flow_Start_Check",
      source: "StartEvent_1",
      target: "Activity_CheckInvoice",
    },
    {
      id: "Flow_Check_Prelim",
      source: "Activity_CheckInvoice",
      target: "Activity_PrelimApprove",
    },
    {
      id: "Flow_Prelim_Gateway",
      source: "Activity_PrelimApprove",
      target: "Gateway_PrelimApproved",
    },
    {
      id: "Flow_Prelim_Yes",
      name: "Yes",
      source: "Gateway_PrelimApproved",
      target: "Activity_SubmitFinal",
    },
    {
      id: "Flow_Prelim_No",
      name: "No",
      source: "Gateway_PrelimApproved",
      target: "End_TimeoutOrReject",
    },
    {
      id: "Flow_Submit_Await",
      source: "Activity_SubmitFinal",
      target: "Gateway_AwaitDecision",
    },
    {
      id: "Flow_Await_Timeout",
      name: "Timeout",
      source: "Gateway_AwaitDecision",
      target: "End_TimeoutOrReject",
    },
    {
      id: "Flow_Await_Approved",
      name: "Approved",
      source: "Gateway_AwaitDecision",
      target: "Activity_MakePayment",
    },
    {
      id: "Flow_Await_Rejected",
      name: "Rejected",
      source: "Gateway_AwaitDecision",
      target: "End_TimeoutOrReject",
    },
    {
      id: "Flow_Pay_OK",
      source: "Activity_MakePayment",
      target: "End_OK",
    },
  ],
};
