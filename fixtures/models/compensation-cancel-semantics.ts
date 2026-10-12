import type { ProcessModel } from "../../src/types/process";

/** Transaction cancel boundary plus a compensation handler with no normal flow. */
export const compensationCancelSemantics: ProcessModel = {
  id: "Process_Compensation_Cancel_Semantics",
  name: "Compensation and Cancel Semantics",
  nodes: [
    { id: "Start", type: "start" },
    {
      id: "Transaction",
      type: "subProcess",
      name: "Reserve transaction",
      subProcess: {
        subProcessType: "transaction",
        expanded: true,
        nodes: [
          { id: "TxStart", type: "start" },
          { id: "Reserve", type: "serviceTask", name: "Reserve stock" },
          {
            id: "UndoReserve",
            type: "serviceTask",
            name: "Undo stock reservation",
            isForCompensation: true,
          },
          {
            id: "CompensateReserve",
            type: "boundaryEvent",
            attachedTo: "Reserve",
            eventDefinition: "compensation",
            eventDefinitionOptions: {
              activityRef: "UndoReserve",
              waitForCompletion: true,
            },
          },
          { id: "CompensationEnd", type: "end" },
          { id: "TxEnd", type: "end" },
        ],
        edges: [
          { id: "TxFlowStart", source: "TxStart", target: "Reserve" },
          { id: "TxFlowEnd", source: "Reserve", target: "TxEnd" },
          {
            id: "CompensationFlowEnd",
            source: "CompensateReserve",
            target: "CompensationEnd",
          },
        ],
      },
    },
    {
      id: "CancelTransaction",
      type: "boundaryEvent",
      attachedTo: "Transaction",
      eventDefinition: "cancel",
    },
    { id: "CancelEnd", type: "end", name: "Rolled back" },
    { id: "End", type: "end", name: "Committed" },
  ],
  edges: [
    { id: "FlowStartTransaction", source: "Start", target: "Transaction" },
    { id: "FlowTransactionEnd", source: "Transaction", target: "End" },
    { id: "FlowCancelEnd", source: "CancelTransaction", target: "CancelEnd" },
  ],
};
