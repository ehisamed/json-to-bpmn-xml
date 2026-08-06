import type { ProcessModel } from "../../src/index";

/**
 * Timer start → task → end (eventDefinition on start).
 */
export const timerStartSimple: ProcessModel = {
  id: "Process_Timer_Start",
  name: "Timer Start Simple",

  nodes: [
    {
      id: "Start_Timer",
      type: "start",
      name: "Every night",
      eventDefinition: "timer",
    },
    {
      id: "Task_Run",
      type: "serviceTask",
      name: "Run batch",
    },
    { id: "End_1", type: "end", name: "Done" },
  ],

  edges: [
    { id: "E1", source: "Start_Timer", target: "Task_Run" },
    { id: "E2", source: "Task_Run", target: "End_1" },
  ],
};
