import type { ProcessModel } from "../../src/index";

/**
 * Case: long exclusive-gateway name.
 * Regression: bpmn-js wrapped mid-word ("Preliminari / ly Approved?").
 */
export const gatewayLongLabel: ProcessModel = {
  id: "Process_Gateway_Long_Label",
  name: "Gateway Long Label",

  nodes: [
    { id: "Start_1", type: "start" },
    { id: "Task_1", type: "userTask", name: "Approve Payment" },
    {
      id: "GW_Long",
      type: "exclusiveGateway",
      name: "Preliminarily Approved?",
    },
    { id: "Task_Yes", type: "serviceTask", name: "Continue" },
    { id: "End_No", type: "end", name: "Stop" },
    { id: "End_Yes", type: "end", name: "OK" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_1" },
    { id: "E2", source: "Task_1", target: "GW_Long" },
    { id: "E_Yes", source: "GW_Long", target: "Task_Yes", name: "Yes" },
    { id: "E_No", source: "GW_Long", target: "End_No", name: "No" },
    { id: "E3", source: "Task_Yes", target: "End_Yes" },
  ],
};
