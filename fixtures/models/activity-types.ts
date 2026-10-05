import type { ProcessModel } from "../../src/types/process";

/** Activity-type coverage: manual, send, receive, script, rule, and call. */
export const activityTypes: ProcessModel = {
  id: "Process_Activity_Types",
  name: "Order Fulfillment Activities",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    { id: "Manual", type: "manualTask", name: "Pack order" },
    {
      id: "Send",
      type: "sendTask",
      name: "Send confirmation",
      implementation: "email",
    },
    {
      id: "Receive",
      type: "receiveTask",
      name: "Receive carrier quote",
      implementation: "carrier-api",
    },
    {
      id: "Script",
      type: "scriptTask",
      name: "Calculate shipping",
      scriptFormat: "javascript",
      script: "return order.weight * rate;",
    },
    {
      id: "Rule",
      type: "businessRuleTask",
      name: "Apply shipping rules",
      implementation: "shipping-rules",
    },
    {
      id: "Call",
      type: "callActivity",
      name: "Create shipment",
      calledElement: "CreateShipmentProcess",
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "Flow_Start_Manual", source: "Start", target: "Manual" },
    { id: "Flow_Manual_Send", source: "Manual", target: "Send" },
    { id: "Flow_Send_Receive", source: "Send", target: "Receive" },
    { id: "Flow_Receive_Script", source: "Receive", target: "Script" },
    { id: "Flow_Script_Rule", source: "Script", target: "Rule" },
    { id: "Flow_Rule_Call", source: "Rule", target: "Call" },
    { id: "Flow_Call_End", source: "Call", target: "End" },
  ],
};
