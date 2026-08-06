import type { ProcessModel } from "../../src/index";

/**
 * Case: Yes goes up to a task, No goes forward to End.
 * Regression: both left the RIGHT face; Yes vertical crossed No horizontal.
 */
export const gatewayYesNoCross: ProcessModel = {
  id: "Process_Gateway_Yes_No_Cross",
  name: "Gateway Yes/No Cross",

  nodes: [
    { id: "Start_1", type: "start" },
    { id: "Task_Prelim", type: "userTask", name: "Prelim Approve" },
    {
      id: "GW_Prelim",
      type: "exclusiveGateway",
      name: "Prelim. approved?",
    },
    { id: "Task_Submit", type: "serviceTask", name: "Submit Final" },
    { id: "End_No", type: "end" },
    { id: "End_Yes", type: "end", name: "OK" },
  ],

  edges: [
    { id: "E1", source: "Start_1", target: "Task_Prelim" },
    { id: "E2", source: "Task_Prelim", target: "GW_Prelim" },
    { id: "E_Yes", source: "GW_Prelim", target: "Task_Submit", name: "Yes" },
    { id: "E_No", source: "GW_Prelim", target: "End_No", name: "No" },
    { id: "E3", source: "Task_Submit", target: "End_Yes" },
  ],
};
