import type { ProcessModel } from "../../src/index";

/**
 * Sparse cross-lane drop: Pack (System) → Deliver (Service) while Payment
 * sits lower in Service — regression for Deliver stuck to lane ceiling.
 */
export const crossLaneSparseDrop: ProcessModel = {
  id: "Process_Sparse_Drop",
  name: "Cross-Lane Sparse Drop",

  lanes: [
    { id: "Lane_System", name: "System" },
    { id: "Lane_Service", name: "External Service" },
  ],

  nodes: [
    {
      id: "Start_1",
      type: "start",
      name: "Start",
      laneId: "Lane_System",
    },
    {
      id: "Task_Pack",
      type: "serviceTask",
      name: "Pack",
      laneId: "Lane_System",
    },
    {
      id: "Task_Payment",
      type: "serviceTask",
      name: "Charge",
      laneId: "Lane_Service",
    },
    {
      id: "Task_Deliver",
      type: "serviceTask",
      name: "Deliver",
      laneId: "Lane_Service",
    },
    {
      id: "End_1",
      type: "end",
      name: "End",
      laneId: "Lane_System",
    },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_Pack" },
    { id: "E2", source: "Start_1", target: "Task_Payment" },
    { id: "E3", source: "Task_Pack", target: "Task_Deliver" },
    { id: "E4", source: "Task_Deliver", target: "End_1" },
    { id: "E5", source: "Task_Payment", target: "End_1" },
  ],
};
