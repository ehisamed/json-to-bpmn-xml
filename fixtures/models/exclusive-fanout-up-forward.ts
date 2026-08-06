import type { ProcessModel } from "../../src/index";

/**
 * Exclusive gateway fan-out: same-lane forward + up-lane branch
 * (regression for Retry vs Pack column stacking).
 */
export const exclusiveFanoutUpForward: ProcessModel = {
  id: "Process_Exclusive_Fanout",
  name: "Exclusive Fan-out Up + Forward",

  lanes: [
    { id: "Lane_User", name: "User" },
    { id: "Lane_System", name: "System" },
  ],

  nodes: [
    { id: "Start_1", type: "start", name: "Start", laneId: "Lane_User" },
    {
      id: "Task_Prepare",
      type: "userTask",
      name: "Prepare",
      laneId: "Lane_User",
    },
    {
      id: "Gateway_Ok",
      type: "exclusiveGateway",
      name: "OK?",
      laneId: "Lane_System",
    },
    {
      id: "Task_Retry",
      type: "userTask",
      name: "Fix manually",
      laneId: "Lane_User",
    },
    {
      id: "Task_Continue",
      type: "serviceTask",
      name: "Continue",
      laneId: "Lane_System",
    },
    { id: "End_Ok", type: "end", name: "Done", laneId: "Lane_System" },
    { id: "End_Cancel", type: "end", name: "Cancelled", laneId: "Lane_User" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_Prepare" },
    { id: "E2", source: "Task_Prepare", target: "Gateway_Ok" },
    { id: "E3", source: "Gateway_Ok", target: "Task_Continue", name: "Yes" },
    { id: "E4", source: "Gateway_Ok", target: "Task_Retry", name: "No" },
    { id: "E5", source: "Task_Continue", target: "End_Ok" },
    { id: "E6", source: "Task_Retry", target: "End_Cancel" },
  ],
};
