import type { ProcessModel } from "../../src/types/process";

/** Data-object coverage: document production and consumption by activities. */
export const dataObjects: ProcessModel = {
  id: "Process_Data_Objects",
  name: "Invoice Processing",
  dataObjects: [
    { id: "InvoiceDocument", name: "Invoice" },
    { id: "ValidatedInvoice", name: "Validated invoice" },
  ],
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    {
      id: "Receive",
      type: "receiveTask",
      name: "Receive invoice",
      dataObjectOutputs: ["InvoiceDocument"],
    },
    {
      id: "Validate",
      type: "serviceTask",
      name: "Validate invoice",
      dataObjectInputs: ["InvoiceDocument"],
      dataObjectOutputs: ["ValidatedInvoice"],
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "Flow_Start_Receive", source: "Start", target: "Receive" },
    { id: "Flow_Receive_Validate", source: "Receive", target: "Validate" },
    { id: "Flow_Validate_End", source: "Validate", target: "End" },
  ],
};
