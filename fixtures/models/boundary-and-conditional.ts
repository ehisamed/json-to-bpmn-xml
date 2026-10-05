import type { ProcessModel } from "../../src/types/process";

/**
 * Boundary timer plus conditional/default sequence flows.
 * The timer interrupts approval and sends the process to the timeout end.
 */
export const boundaryAndConditional: ProcessModel = {
  id: "Process_Boundary_Conditional",
  name: "Boundary and Conditional Flow",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    { id: "Approve", type: "userTask", name: "Approve request" },
    {
      id: "Timeout",
      type: "boundaryEvent",
      attachedTo: "Approve",
      eventDefinition: "timer",
      name: "Timeout",
    },
    { id: "Decision", type: "exclusiveGateway", name: "Approved?" },
    { id: "Success", type: "end", name: "Approved" },
    { id: "Rejected", type: "end", name: "Rejected" },
    { id: "TimedOut", type: "end", name: "Timed out" },
  ],
  edges: [
    { id: "Flow_Start_Approve", source: "Start", target: "Approve" },
    { id: "Flow_Approve_Decision", source: "Approve", target: "Decision" },
    {
      id: "Flow_Approve_Timeout",
      source: "Timeout",
      target: "TimedOut",
      name: "deadline",
    },
    {
      id: "Flow_Decision_Success",
      source: "Decision",
      target: "Success",
      name: "Yes",
      condition: "approved = true",
    },
    {
      id: "Flow_Decision_Rejected",
      source: "Decision",
      target: "Rejected",
      name: "No",
      isDefault: true,
    },
  ],
};
