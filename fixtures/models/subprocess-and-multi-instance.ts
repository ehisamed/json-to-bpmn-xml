import type { ProcessModel } from "../../src/index";

/**
 * Collapsed subProcess + multi-instance task in one short flow.
 */
export const subprocessAndMultiInstance: ProcessModel = {
  id: "Process_Sub_MI",
  name: "SubProcess and Multi-Instance",

  nodes: [
    { id: "Start_1", type: "start", name: "Start" },
    {
      id: "Task_MI",
      type: "userTask",
      name: "Review each item",
      multiInstance: { sequential: false },
    },
    {
      id: "Sub_Notify",
      type: "subProcess",
      name: "Notify batch",
    },
    { id: "End_1", type: "end", name: "End" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_MI" },
    { id: "E2", source: "Task_MI", target: "Sub_Notify" },
    { id: "E3", source: "Sub_Notify", target: "End_1" },
  ],
};
