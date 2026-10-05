import type { ProcessModel } from "../../src/types/process";

/** Link throw/catch pair coverage. */
export const linkEvents: ProcessModel = {
  id: "Process_Link_Events",
  name: "Link Event Handoff",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    {
      id: "LinkThrow",
      type: "intermediateThrow",
      name: "Jump to review",
      eventDefinition: "link",
      eventDefinitionOptions: { linkName: "ReviewHandoff", linkDirection: "source" },
    },
    { id: "Prepare", type: "serviceTask", name: "Prepare review" },
    {
      id: "LinkCatch",
      type: "intermediateCatch",
      name: "Review handoff",
      eventDefinition: "link",
      eventDefinitionOptions: { linkName: "ReviewHandoff", linkDirection: "target" },
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "FlowStartThrow", source: "Start", target: "LinkThrow" },
    { id: "FlowThrowPrepare", source: "LinkThrow", target: "Prepare" },
    { id: "FlowPrepareCatch", source: "Prepare", target: "LinkCatch" },
    { id: "FlowCatchEnd", source: "LinkCatch", target: "End" },
  ],
};
