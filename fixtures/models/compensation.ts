import type { ProcessModel } from "../../src/types/process";

/** Compensation event activityRef and waitForCompletion coverage. */
export const compensation: ProcessModel = {
  id: "Process_Compensation",
  name: "Payment Compensation",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    { id: "ChargeCard", type: "serviceTask", name: "Charge card" },
    { id: "UndoCharge", type: "serviceTask", name: "Undo card charge" },
    {
      id: "Compensate",
      type: "boundaryEvent",
      attachedTo: "ChargeCard",
      eventDefinition: "compensation",
      eventDefinitionOptions: {
        activityRef: "UndoCharge",
        waitForCompletion: false,
      },
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "FlowStartCharge", source: "Start", target: "ChargeCard" },
    { id: "FlowChargeEnd", source: "ChargeCard", target: "End" },
  ],
};
