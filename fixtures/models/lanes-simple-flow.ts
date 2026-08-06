import type { ProcessModel } from "../../src/index";

/**
 * Simple linear flow inside one lane:
 * Start → User Task → End
 */
export const lanesSimpleFlow: ProcessModel = {
  id: "Process_Lanes_Simple_Flow",
  name: "Lanes — Simple Flow",

  lanes: [
    { id: "Lane_User", name: "User" },
    { id: "Lane_System", name: "System" },
    { id: "Lane_Service", name: "External Service" },
  ],

  nodes: [
    {
      id: "Start_1",
      type: "start",
      name: "Start",
      laneId: "Lane_User",
    },
    {
      id: "Task_FillForm",
      type: "userTask",
      name: "Fill form",
      laneId: "Lane_User",
    },
    {
      id: "End_1",
      type: "end",
      name: "End",
      laneId: "Lane_User",
    },
  ],

  edges: [
    { id: "Flow_1", source: "Start_1", target: "Task_FillForm" },
    { id: "Flow_2", source: "Task_FillForm", target: "End_1" },
  ],
};
