import type { ProcessModel } from "../../src/index";

/**
 * Message start → task → end.
 */
export const messageStartSimple: ProcessModel = {
  id: "Process_Message_Start",
  name: "Message Start Simple",

  nodes: [
    {
      id: "Start_Msg",
      type: "start",
      name: "Message received",
      eventDefinition: "message",
    },
    {
      id: "Task_Handle",
      type: "serviceTask",
      name: "Handle message",
    },
    { id: "End_1", type: "end", name: "Done" },
  ],

  edges: [
    { id: "E1", source: "Start_Msg", target: "Task_Handle" },
    { id: "E2", source: "Task_Handle", target: "End_1" },
  ],
};
