import type { ProcessModel } from "../../src/types/process";

/** Text annotation, group, and association coverage. */
export const artifacts: ProcessModel = {
  id: "Process_Artifacts",
  name: "Artifact Review",
  textAnnotations: [
    {
      id: "Note_Compliance",
      text: "Manual compliance review is required for high-risk invoices.",
    },
  ],
  groups: [{ id: "Group_Review", name: "Review controls", categoryValue: "Controls" }],
  associations: [
    {
      id: "Association_Note",
      source: "Approve",
      target: "Note_Compliance",
      associationDirection: "One",
    },
  ],
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    { id: "Approve", type: "userTask", name: "Approve invoice" },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "Flow_Start_Approve", source: "Start", target: "Approve" },
    { id: "Flow_Approve_End", source: "Approve", target: "End" },
  ],
};
