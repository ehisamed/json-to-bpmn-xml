import type { ProcessModel } from "../../src/index";

/**
 * Three-way exclusive gateway with edge labels.
 */
export const exclusiveThreeWay: ProcessModel = {
  id: "Process_Exclusive_Three_Way",
  name: "Exclusive Three-Way",

  nodes: [
    { id: "Start_1", type: "start", name: "Start" },
    { id: "Task_Review", type: "userTask", name: "Review" },
    {
      id: "GW_Decision",
      type: "exclusiveGateway",
      name: "Decision?",
    },
    { id: "Task_Accept", type: "serviceTask", name: "Accept" },
    { id: "Task_Hold", type: "userTask", name: "Hold" },
    { id: "Task_Reject", type: "serviceTask", name: "Reject" },
    { id: "End_A", type: "end", name: "Accepted" },
    { id: "End_H", type: "end", name: "Held" },
    { id: "End_R", type: "end", name: "Rejected" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_Review" },
    { id: "E2", source: "Task_Review", target: "GW_Decision" },
    {
      id: "E3",
      source: "GW_Decision",
      target: "Task_Accept",
      name: "Accept",
    },
    { id: "E4", source: "GW_Decision", target: "Task_Hold", name: "Hold" },
    {
      id: "E5",
      source: "GW_Decision",
      target: "Task_Reject",
      name: "Reject",
    },
    { id: "E6", source: "Task_Accept", target: "End_A" },
    { id: "E7", source: "Task_Hold", target: "End_H" },
    { id: "E8", source: "Task_Reject", target: "End_R" },
  ],
};
