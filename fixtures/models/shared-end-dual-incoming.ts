import type { ProcessModel } from "../../src/index";

/**
 * Case: two sequence flows into one End from below/left.
 * Regression: docks stacked ~1px apart on the left face.
 */
export const sharedEndDualIncoming: ProcessModel = {
  id: "Process_Shared_End_Dual",
  name: "Shared End Dual Incoming",

  nodes: [
    { id: "Start_1", type: "start", name: "Start" },
    { id: "Task_A", type: "serviceTask", name: "Path A" },
    { id: "Task_B", type: "userTask", name: "Path B" },
    { id: "End_1", type: "end", name: "End" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_A" },
    { id: "E2", source: "Start_1", target: "Task_B" },
    { id: "E3", source: "Task_A", target: "End_1" },
    { id: "E4", source: "Task_B", target: "End_1" },
  ],
};
