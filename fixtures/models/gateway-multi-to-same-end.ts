import type { ProcessModel } from "../../src/index";

/**
 * Case: exclusive gateway with Approved↑ plus Rejected+Timeout → same End.
 * Regression: Rejected/Timeout shared one channel; labels overlapped.
 */
export const gatewayMultiToSameEnd: ProcessModel = {
  id: "Process_Gateway_Multi_Same_End",
  name: "Gateway Multi To Same End",

  nodes: [
    { id: "Start_1", type: "start" },
    { id: "Task_Submit", type: "serviceTask", name: "Submit" },
    {
      id: "GW_Await",
      type: "exclusiveGateway",
      name: "Await decision",
    },
    { id: "Task_Pay", type: "serviceTask", name: "Make Payment" },
    { id: "End_Fail", type: "end" },
    { id: "End_OK", type: "end", name: "OK" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_Submit" },
    { id: "E2", source: "Task_Submit", target: "GW_Await" },
    {
      id: "E_Approved",
      source: "GW_Await",
      target: "Task_Pay",
      name: "Approved",
    },
    {
      id: "E_Rejected",
      source: "GW_Await",
      target: "End_Fail",
      name: "Rejected",
    },
    {
      id: "E_Timeout",
      source: "GW_Await",
      target: "End_Fail",
      name: "Timeout",
    },
    { id: "E3", source: "Task_Pay", target: "End_OK" },
  ],
};
