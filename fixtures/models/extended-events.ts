import type { ProcessModel } from "../../src/types/process";

/** Signal, conditional, error, escalation, and terminate event definitions. */
export const extendedEvents: ProcessModel = {
  id: "Process_Extended_Events",
  name: "Extended Event Definitions",
  nodes: [
    {
      id: "StartSignal",
      type: "start",
      name: "Signal received",
      eventDefinition: "signal",
    },
    {
      id: "CheckCondition",
      type: "intermediateCatch",
      name: "Check condition",
      eventDefinition: "conditional",
    },
    { id: "Work", type: "serviceTask", name: "Process request" },
    {
      id: "ErrorBoundary",
      type: "boundaryEvent",
      attachedTo: "Work",
      eventDefinition: "error",
      name: "Error",
    },
    {
      id: "Escalation",
      type: "intermediateCatch",
      name: "Escalation received",
      eventDefinition: "escalation",
    },
    { id: "ErrorEnd", type: "end", name: "Failed" },
    {
      id: "Terminate",
      type: "end",
      name: "Terminated",
      eventDefinition: "terminate",
    },
  ],
  edges: [
    { id: "Flow_Start_Check", source: "StartSignal", target: "CheckCondition" },
    { id: "Flow_Check_Work", source: "CheckCondition", target: "Work" },
    { id: "Flow_Work_Escalation", source: "Work", target: "Escalation" },
    { id: "Flow_Escalation_Terminate", source: "Escalation", target: "Terminate" },
    { id: "Flow_Error_End", source: "ErrorBoundary", target: "ErrorEnd" },
  ],
};
