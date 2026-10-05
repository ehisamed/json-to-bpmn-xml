import type { ProcessModel } from "../../src/types/process";

/** Event subprocess and transaction subprocess coverage. */
export const advancedSubprocesses: ProcessModel = {
  id: "Process_Advanced_Subprocesses",
  name: "Order Fulfillment Recovery",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    {
      id: "FulfillTransaction",
      type: "subProcess",
      name: "Fulfill order transaction",
      subProcess: {
        subProcessType: "transaction",
        expanded: true,
        nodes: [
          { id: "TxStart", type: "start" },
          { id: "ReserveStock", type: "serviceTask", name: "Reserve stock" },
          { id: "TxEnd", type: "end" },
        ],
        edges: [
          { id: "TxFlowStart", source: "TxStart", target: "ReserveStock" },
          { id: "TxFlowEnd", source: "ReserveStock", target: "TxEnd" },
        ],
      },
    },
    {
      id: "RecoveryEvents",
      type: "subProcess",
      name: "Recovery handler",
      subProcess: {
        subProcessType: "event",
        expanded: true,
        nodes: [
          {
            id: "RecoveryStart",
            type: "start",
            eventDefinition: "error",
            name: "Order failed",
          },
          { id: "NotifySupport", type: "sendTask", name: "Notify support" },
          { id: "RecoveryEnd", type: "end" },
        ],
        edges: [
          { id: "RecoveryFlowNotify", source: "RecoveryStart", target: "NotifySupport" },
          { id: "RecoveryFlowEnd", source: "NotifySupport", target: "RecoveryEnd" },
        ],
      },
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "FlowStartTx", source: "Start", target: "FulfillTransaction" },
    { id: "FlowTxRecovery", source: "FulfillTransaction", target: "RecoveryEvents" },
    { id: "FlowRecoveryEnd", source: "RecoveryEvents", target: "End" },
  ],
};
