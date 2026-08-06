import type { ProcessModel } from "../../src/index";

/**
 * Case (desired): exclusive split/join — Yes through a task, No bypasses
 * over the top into the join gateway (top + left docks).
 */
export const gatewayJoinBypassTop: ProcessModel = {
  id: "Process_Gateway_Join_Bypass_Top",
  name: "Gateway Join Bypass Top",

  nodes: [
    { id: "Start_1", type: "start", name: "Timer start", eventDefinition: "timer" },
    { id: "Task_Select", type: "serviceTask", name: "Select Due Invoices" },
    { id: "GW_Split", type: "exclusiveGateway", name: "Overdraft?" },
    { id: "Task_Approve", type: "userTask", name: "Approve Payments" },
    { id: "GW_Join", type: "exclusiveGateway" },
    { id: "Task_Notify", type: "serviceTask", name: "Notify Payables" },
    { id: "End_1", type: "end" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_Select" },
    { id: "E2", source: "Task_Select", target: "GW_Split" },
    {
      id: "E_Yes",
      source: "GW_Split",
      target: "Task_Approve",
      name: "Yes",
    },
    { id: "E_No", source: "GW_Split", target: "GW_Join", name: "NO" },
    { id: "E3", source: "Task_Approve", target: "GW_Join" },
    { id: "E4", source: "GW_Join", target: "Task_Notify" },
    { id: "E5", source: "Task_Notify", target: "End_1" },
  ],
};
