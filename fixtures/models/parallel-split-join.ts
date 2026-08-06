import type { ProcessModel } from "../../src/index";

/**
 * Parallel split → two tasks → parallel join (AND gateway).
 */
export const parallelSplitJoin: ProcessModel = {
  id: "Process_Parallel_Split_Join",
  name: "Parallel Split Join",

  nodes: [
    { id: "Start_1", type: "start", name: "Start" },
    { id: "GW_Split", type: "parallelGateway", name: "Split" },
    { id: "Task_A", type: "serviceTask", name: "Path A" },
    { id: "Task_B", type: "userTask", name: "Path B" },
    { id: "GW_Join", type: "parallelGateway", name: "Join" },
    { id: "End_1", type: "end", name: "End" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "GW_Split" },
    { id: "E2", source: "GW_Split", target: "Task_A" },
    { id: "E3", source: "GW_Split", target: "Task_B" },
    { id: "E4", source: "Task_A", target: "GW_Join" },
    { id: "E5", source: "Task_B", target: "GW_Join" },
    { id: "E6", source: "GW_Join", target: "End_1" },
  ],
};
