import type { ProcessModel } from "../../src/index";

/**
 * Schedule Payments pool from `diagram (9).bpmn` (second participant).
 *
 * Original BPMN also includes unsupported features (omitted or approximated):
 * - generic bpmn:task → serviceTask
 * - subProcess "Notify Payables" → serviceTask
 * - multiInstanceLoopCharacteristics → omitted
 * - dataStore read/write associations → omitted
 * - messageFlow to Process Payable → omitted
 * - colors / bioc attributes → omitted
 *
 * Approximate flow:
 *   Timer start → Select Due Invoices → Overdraft?
 *     ├── Yes → Approve Payments ─┐
 *     └── No  ────────────────────┴→ Notify Payables → End
 */
export const schedulePayments: ProcessModel = {
  id: "Process_Schedule_Payments",
  name: "Schedule Payments",

  nodes: [
    {
      id: "Event_TimerStart",
      type: "start",
      name: "Timer start",
      eventDefinition: "timer",
    },
    {
      id: "Activity_SelectDue",
      // Original: bpmn:task + sequential multiInstance + dataInput from DB
      type: "serviceTask",
      name: "Select Due Invoices",
    },
    {
      id: "Gateway_Overdraft",
      type: "exclusiveGateway",
      name: "Overdraft?",
    },
    {
      id: "Activity_ApprovePayments",
      type: "userTask",
      name: "Approve Payments",
    },
    {
      id: "Gateway_Join",
      type: "exclusiveGateway",
    },
    {
      id: "Activity_NotifyPayables",
      // Original: subProcess + sequential multiInstance + dataOutput to DB
      type: "serviceTask",
      name: "Notify Payables",
    },
    {
      id: "Event_End",
      type: "end",
    },
  ],

  edges: [
    {
      id: "Flow_Start_Select",
      source: "Event_TimerStart",
      target: "Activity_SelectDue",
    },
    {
      id: "Flow_Select_Overdraft",
      source: "Activity_SelectDue",
      target: "Gateway_Overdraft",
    },
    {
      id: "Flow_Overdraft_Yes",
      name: "Yes",
      source: "Gateway_Overdraft",
      target: "Activity_ApprovePayments",
    },
    {
      id: "Flow_Overdraft_No",
      name: "NO",
      source: "Gateway_Overdraft",
      target: "Gateway_Join",
    },
    {
      id: "Flow_Approve_Join",
      source: "Activity_ApprovePayments",
      target: "Gateway_Join",
    },
    {
      id: "Flow_Join_Notify",
      source: "Gateway_Join",
      target: "Activity_NotifyPayables",
    },
    {
      id: "Flow_Notify_End",
      source: "Activity_NotifyPayables",
      target: "Event_End",
    },
  ],
};
