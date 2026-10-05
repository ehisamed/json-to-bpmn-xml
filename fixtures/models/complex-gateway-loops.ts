import type { ProcessModel } from "../../src/types/process";

/** Complex gateway and cardinality/completion-condition coverage. */
export const complexGatewayLoops: ProcessModel = {
  id: "Process_Complex_Gateway_Loops",
  name: "Quality Review",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    { id: "Split", type: "complexGateway", name: "Need two approvals" },
    {
      id: "Reviewers",
      type: "userTask",
      name: "Collect reviews",
      multiInstance: {
        sequential: false,
        loopCardinality: 3,
        completionCondition: "approved >= 2",
        behavior: "Complex",
      },
    },
    { id: "End", type: "end", name: "Approved" },
  ],
  edges: [
    { id: "FlowStartSplit", source: "Start", target: "Split" },
    { id: "FlowSplitReviewers", source: "Split", target: "Reviewers" },
    { id: "FlowReviewersEnd", source: "Reviewers", target: "End" },
  ],
};
