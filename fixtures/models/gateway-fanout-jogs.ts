import type { ProcessModel } from "../../src/index";

/**
 * Case: exclusive gateway with 3 outs (up / forward / down).
 * Regression: top/bottom branches left the RIGHT face with a short
 * horizontal stub ("detached" Hold/Reject arrows).
 */
export const gatewayFanoutJogs: ProcessModel = {
  id: "Process_Gateway_Fanout_Jogs",
  name: "Gateway Fan-out Jogs",

  nodes: [
    { id: "Start_1", type: "start", name: "Start" },
    { id: "Task_Before", type: "userTask", name: "Review" },
    { id: "GW_Decision", type: "exclusiveGateway", name: "Decision?" },
    { id: "Task_Hold", type: "userTask", name: "Hold" },
    { id: "Task_Accept", type: "serviceTask", name: "Accept" },
    { id: "Task_Reject", type: "serviceTask", name: "Reject" },
    { id: "End_H", type: "end", name: "Held" },
    { id: "End_A", type: "end", name: "Accepted" },
    { id: "End_R", type: "end", name: "Rejected" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_Before" },
    { id: "E2", source: "Task_Before", target: "GW_Decision" },
    { id: "E_Hold", source: "GW_Decision", target: "Task_Hold", name: "Hold" },
    {
      id: "E_Accept",
      source: "GW_Decision",
      target: "Task_Accept",
      name: "Accept",
    },
    {
      id: "E_Reject",
      source: "GW_Decision",
      target: "Task_Reject",
      name: "Reject",
    },
    { id: "E6", source: "Task_Hold", target: "End_H" },
    { id: "E7", source: "Task_Accept", target: "End_A" },
    { id: "E8", source: "Task_Reject", target: "End_R" },
  ],
};
