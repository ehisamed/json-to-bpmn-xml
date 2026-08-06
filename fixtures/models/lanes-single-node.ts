import type { ProcessModel } from "../../src/index";

/**
 * Minimal lanes smoke test: three lanes, a single start event in the first lane.
 */
export const lanesSingleNode: ProcessModel = {
  id: "Process_Lanes_Single_Node",
  name: "Lanes — Single Node",

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
  ],

  edges: [],
};
