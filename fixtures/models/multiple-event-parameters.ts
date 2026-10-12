import type { ProcessModel } from "../../src/types/process";

/** Each event definition receives its own timer/message/signal parameters. */
export const multipleEventParameters: ProcessModel = {
  id: "Process_Multiple_Event_Parameters",
  name: "Multiple Event Parameters",
  messages: [{ id: "Message_InvoiceReceived", name: "Invoice received" }],
  signals: [{ id: "Signal_InvoiceApproved", name: "Invoice approved" }],
  nodes: [
    { id: "Start", type: "start" },
    {
      id: "WaitForAny",
      type: "intermediateCatch",
      name: "Wait for invoice, approval, or timeout",
      eventDefinitions: ["timer", "message", "signal"],
      eventDefinitionOptionsByType: {
        timer: { timeDuration: "PT30M" },
        message: { messageRef: "Message_InvoiceReceived" },
        signal: { signalRef: "Signal_InvoiceApproved" },
      },
    },
    { id: "End", type: "end" },
  ],
  edges: [
    { id: "FlowStartWait", source: "Start", target: "WaitForAny" },
    { id: "FlowWaitEnd", source: "WaitForAny", target: "End" },
  ],
};
