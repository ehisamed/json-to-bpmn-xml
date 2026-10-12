import type { ProcessModel } from "../../src/types/process";

/** Reusable Message/Signal definitions with event and task references. */
export const messageSignalReferences: ProcessModel = {
  id: "Collaboration_Message_Signal_References",
  name: "Message and Signal References",
  messages: [
    { id: "Message_OrderSubmitted", name: "Order submitted" },
    { id: "Message_OrderAccepted", name: "Order accepted" },
  ],
  signals: [{ id: "Signal_OrderApproved", name: "Order approved" }],
  processes: [
    {
      id: "Process_Sales",
      name: "Sales",
      nodes: [
        {
          id: "SalesStart",
          type: "start",
          eventDefinition: "message",
          eventDefinitionOptions: { messageRef: "Message_OrderSubmitted" },
        },
        {
          id: "SendOrder",
          type: "sendTask",
          name: "Send order to fulfillment",
          messageRef: "Message_OrderSubmitted",
        },
        { id: "SalesEnd", type: "end" },
      ],
      edges: [
        { id: "SalesFlow1", source: "SalesStart", target: "SendOrder" },
        { id: "SalesFlow2", source: "SendOrder", target: "SalesEnd" },
      ],
    },
    {
      id: "Process_Fulfillment",
      name: "Fulfillment",
      nodes: [
        {
          id: "ReceiveOrder",
          type: "receiveTask",
          name: "Receive order",
          messageRef: "Message_OrderAccepted",
        },
        {
          id: "WaitForApproval",
          type: "intermediateCatch",
          name: "Wait for approval signal",
          eventDefinition: "signal",
          eventDefinitionOptions: { signalRef: "Signal_OrderApproved" },
        },
        { id: "FulfillmentEnd", type: "end" },
      ],
      edges: [
        { id: "FulfillmentFlow1", source: "ReceiveOrder", target: "WaitForApproval" },
        { id: "FulfillmentFlow2", source: "WaitForApproval", target: "FulfillmentEnd" },
      ],
    },
  ],
  messageFlows: [
    { id: "MessageFlow_Order", source: "SendOrder", target: "ReceiveOrder", name: "Order" },
  ],
};
