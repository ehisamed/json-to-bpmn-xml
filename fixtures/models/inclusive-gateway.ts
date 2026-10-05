import type { ProcessModel } from "../../src/types/process";

/**
 * Inclusive OR split/join: one or both optional notifications may run,
 * then the process waits for all activated branches at the joining gateway.
 */
export const inclusiveGateway: ProcessModel = {
  id: "Process_Inclusive_Gateway",
  name: "Optional Notifications",
  nodes: [
    { id: "Start", type: "start", name: "Start" },
    { id: "Prepare", type: "serviceTask", name: "Prepare notification" },
    { id: "Split", type: "inclusiveGateway", name: "Which channels?" },
    { id: "Email", type: "serviceTask", name: "Send email" },
    { id: "Sms", type: "serviceTask", name: "Send SMS" },
    { id: "Join", type: "inclusiveGateway", name: "Wait for channels" },
    { id: "Finish", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "Flow_Start_Prepare", source: "Start", target: "Prepare" },
    { id: "Flow_Prepare_Split", source: "Prepare", target: "Split" },
    {
      id: "Flow_Split_Email",
      source: "Split",
      target: "Email",
      name: "Email enabled",
      condition: "sendEmail = true",
    },
    {
      id: "Flow_Split_Sms",
      source: "Split",
      target: "Sms",
      name: "SMS enabled",
      condition: "sendSms = true",
    },
    { id: "Flow_Email_Join", source: "Email", target: "Join" },
    { id: "Flow_Sms_Join", source: "Sms", target: "Join" },
    { id: "Flow_Join_Finish", source: "Join", target: "Finish" },
  ],
};
