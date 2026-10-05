import type { ProcessModel } from "../../src/types/process";

/** Cancel, compensation, and link event-definition coverage. */
export const controlEvents: ProcessModel = {
  id: "Process_Control_Events",
  name: "Order Control Events",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    { id: "CancelOrder", type: "intermediateCatch", name: "Cancel order", eventDefinition: "cancel" },
    { id: "UndoReservation", type: "intermediateCatch", name: "Undo reservation", eventDefinition: "compensation" },
    { id: "LinkCatch", type: "intermediateCatch", name: "Continue", eventDefinition: "link" },
    { id: "Notify", type: "serviceTask", name: "Notify customer" },
    {
      id: "MultipleWait",
      type: "intermediateCatch",
      name: "Continue after timer or message",
      eventDefinitions: ["timer", "message"],
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "FlowStartCancel", source: "Start", target: "CancelOrder" },
    { id: "FlowCancelCompensate", source: "CancelOrder", target: "UndoReservation" },
    { id: "FlowCompensateLink", source: "UndoReservation", target: "LinkCatch" },
    { id: "FlowLinkNotify", source: "LinkCatch", target: "Notify" },
    { id: "FlowNotifyMultiple", source: "Notify", target: "MultipleWait" },
    { id: "FlowMultipleEnd", source: "MultipleWait", target: "End" },
  ],
};
