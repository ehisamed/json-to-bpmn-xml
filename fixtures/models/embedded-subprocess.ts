import type { ProcessModel } from "../../src/types/process";

/** Embedded subprocess body is serialized into the parent bpmn:subProcess. */
export const embeddedSubprocess: ProcessModel = {
  id: "Process_Embedded_Subprocess",
  name: "Customer Verification",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    {
      id: "Verify",
      type: "subProcess",
      name: "Verify customer",
      subProcess: {
        expanded: true,
        nodes: [
          { id: "VerifyStart", type: "start", name: "Begin checks" },
          { id: "CheckIdentity", type: "serviceTask", name: "Check identity" },
          { id: "VerifyEnd", type: "end", name: "Checks complete" },
        ],
        edges: [
          { id: "VerifyFlow_1", source: "VerifyStart", target: "CheckIdentity" },
          { id: "VerifyFlow_2", source: "CheckIdentity", target: "VerifyEnd" },
        ],
      },
    },
    { id: "End", type: "end", name: "Finished" },
  ],
  edges: [
    { id: "Flow_Start_Verify", source: "Start", target: "Verify" },
    { id: "Flow_Verify_End", source: "Verify", target: "End" },
  ],
};
