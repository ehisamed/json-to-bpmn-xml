import type { ProcessModel } from "../../src/types/process";

/** Reusable Error/Escalation definitions with BPMN codes and event references. */
export const errorEscalationReferences: ProcessModel = {
  id: "Process_Error_Escalation_References",
  name: "Error and Escalation References",
  errors: [
    { id: "Error_PaymentDeclined", name: "Payment declined", errorCode: "PAYMENT_DECLINED" },
  ],
  escalations: [
    {
      id: "Escalation_ManagerApproval",
      name: "Manager approval required",
      escalationCode: "MANAGER_APPROVAL_REQUIRED",
    },
  ],
  nodes: [
    { id: "Start", type: "start", name: "Start payment" },
    { id: "Charge", type: "serviceTask", name: "Charge card" },
    {
      id: "PaymentError",
      type: "boundaryEvent",
      attachedTo: "Charge",
      eventDefinition: "error",
      eventDefinitionOptions: { errorRef: "Error_PaymentDeclined" },
    },
    {
      id: "ApprovalEscalation",
      type: "intermediateThrow",
      name: "Escalate for approval",
      eventDefinition: "escalation",
      eventDefinitionOptions: { escalationRef: "Escalation_ManagerApproval" },
    },
    { id: "End", type: "end", name: "Complete" },
  ],
  edges: [
    { id: "FlowStartCharge", source: "Start", target: "Charge" },
    { id: "FlowChargeEnd", source: "Charge", target: "End" },
    { id: "FlowEscalationEnd", source: "ApprovalEscalation", target: "End" },
  ],
};
