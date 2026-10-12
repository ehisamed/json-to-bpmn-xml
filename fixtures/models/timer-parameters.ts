import type { ProcessModel } from "../../src/types/process";

/** Timer date, duration, and repeating cycle coverage. */
export const timerParameters: ProcessModel = {
  id: "Process_Timer_Parameters",
  name: "Timer Parameters",
  nodes: [
    {
      id: "StartAtDate",
      type: "start",
      name: "Start on scheduled date",
      eventDefinition: "timer",
      eventDefinitionOptions: { timeDate: "2026-10-12T09:00:00Z" },
    },
    {
      id: "WaitDuration",
      type: "intermediateCatch",
      name: "Wait fifteen minutes",
      eventDefinition: "timer",
      eventDefinitionOptions: { timeDuration: "PT15M" },
    },
    { id: "Process", type: "serviceTask", name: "Process request" },
    {
      id: "RetryCycle",
      type: "boundaryEvent",
      attachedTo: "Process",
      eventDefinition: "timer",
      eventDefinitionOptions: { timeCycle: "R/PT1H" },
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "FlowStartWait", source: "StartAtDate", target: "WaitDuration" },
    { id: "FlowWaitProcess", source: "WaitDuration", target: "Process" },
    { id: "FlowProcessEnd", source: "Process", target: "End" },
  ],
};
