import type { ProcessModel } from "../../src/types/process";

/** Ad-hoc work queue: activities may be selected in arbitrary order. */
export const adHocSubprocess: ProcessModel = {
  id: "Process_AdHoc",
  name: "Incident review checklist",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    {
      id: "ReviewChecklist",
      type: "subProcess",
      name: "Review incident checklist",
      subProcess: {
        subProcessType: "adHoc",
        ordering: "Parallel",
        cancelRemainingInstances: false,
        completionCondition: "completedTasks >= 2",
        nodes: [
          { id: "CheckLogs", type: "task", name: "Check logs" },
          { id: "ContactCustomer", type: "userTask", name: "Contact customer" },
          { id: "CreateReport", type: "task", name: "Create report" },
        ],
        edges: [],
        expanded: false,
      },
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "Flow_Start_Review", source: "Start", target: "ReviewChecklist" },
    { id: "Flow_Review_End", source: "ReviewChecklist", target: "End" },
  ],
};
