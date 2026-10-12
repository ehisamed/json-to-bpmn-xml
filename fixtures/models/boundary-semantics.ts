import type { ProcessModel } from "../../src/types/process";

/** Multiple boundary events on one activity, including non-interrupting mode. */
export const boundarySemantics: ProcessModel = {
  id: "Process_Boundary_Semantics",
  name: "Boundary Event Semantics",
  messages: [{ id: "Message_Reminder", name: "Reminder requested" }],
  errors: [{ id: "Error_PaymentFailed", name: "Payment failed", errorCode: "PAYMENT_FAILED" }],
  nodes: [
    { id: "Start", type: "start" },
    { id: "Review", type: "userTask", name: "Review payment" },
    {
      id: "Timeout",
      type: "boundaryEvent",
      attachedTo: "Review",
      eventDefinition: "timer",
      name: "Interrupting timeout",
    },
    {
      id: "Reminder",
      type: "boundaryEvent",
      attachedTo: "Review",
      eventDefinition: "message",
      cancelActivity: false,
      eventDefinitionOptions: { messageRef: "Message_Reminder" },
      name: "Non-interrupting reminder",
    },
    {
      id: "PaymentError",
      type: "boundaryEvent",
      attachedTo: "Review",
      eventDefinition: "error",
      eventDefinitionOptions: { errorRef: "Error_PaymentFailed" },
      name: "Payment error",
    },
    { id: "End", type: "end" },
    { id: "TimeoutEnd", type: "end", name: "Timeout path" },
    { id: "ReminderEnd", type: "end", name: "Reminder path" },
    { id: "ErrorEnd", type: "end", name: "Error path" },
  ],
  edges: [
    { id: "FlowStartReview", source: "Start", target: "Review" },
    { id: "FlowReviewEnd", source: "Review", target: "End" },
    { id: "FlowTimeoutEnd", source: "Timeout", target: "TimeoutEnd" },
    { id: "FlowReminderEnd", source: "Reminder", target: "ReminderEnd" },
    { id: "FlowErrorEnd", source: "PaymentError", target: "ErrorEnd" },
  ],
};
