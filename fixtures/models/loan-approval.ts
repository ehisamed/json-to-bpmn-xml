import type { ProcessModel } from "../../src/index";

/**
 * Complex collaboration: Loan Approval.
 *
 * Pools:
 * - Bank (Clerk + Underwriter lanes)
 * - Credit Bureau (external)
 *
 * Features: event-based wait for bureau reply / timeout, message flows,
 * credit-report data store, exclusive reject path, multi-instance docs.
 */
export const loanApproval: ProcessModel = {
  id: "LoanApproval",
  name: "Loan Approval",

  dataStores: [
    {
      id: "DS_CreditReports",
      name: "Credit Reports",
    },
  ],

  processes: [
    {
      id: "Process_Bank",
      name: "Bank",
      participantId: "Participant_Bank",
      participantName: "Bank",
      lanes: [
        { id: "Lane_Clerk", name: "Clerk" },
        { id: "Lane_Underwriter", name: "Underwriter" },
      ],
      nodes: [
        {
          id: "BK_Start",
          type: "start",
          laneId: "Lane_Clerk",
        },
        {
          id: "BK_Collect",
          type: "userTask",
          name: "Collect Application",
          laneId: "Lane_Clerk",
        },
        {
          id: "BK_Assess",
          type: "userTask",
          name: "Assess Risk",
          laneId: "Lane_Underwriter",
        },
        {
          id: "BK_RiskOk",
          type: "exclusiveGateway",
          name: "Risk Acceptable?",
          laneId: "Lane_Underwriter",
        },
        {
          id: "BK_RequestBureau",
          type: "task",
          name: "Request Credit Report",
          laneId: "Lane_Underwriter",
          multiInstance: true,
          dataOutputs: ["DS_CreditReports"],
        },
        {
          id: "BK_Wait",
          type: "eventBasedGateway",
          laneId: "Lane_Underwriter",
        },
        {
          id: "BK_ReportReady",
          type: "intermediateCatch",
          name: "Report Ready",
          eventDefinition: "message",
          laneId: "Lane_Underwriter",
        },
        {
          id: "BK_BureauReject",
          type: "intermediateCatch",
          name: "Bureau Reject",
          eventDefinition: "message",
          laneId: "Lane_Underwriter",
        },
        {
          id: "BK_Timeout",
          type: "intermediateCatch",
          eventDefinition: "timer",
          laneId: "Lane_Underwriter",
        },
        {
          id: "BK_Decide",
          type: "serviceTask",
          name: "Auto Decide Limit",
          laneId: "Lane_Underwriter",
        },
        {
          id: "BK_EndOk",
          type: "end",
          name: "Approved",
          laneId: "Lane_Underwriter",
        },
        {
          id: "BK_EndFail",
          type: "end",
          laneId: "Lane_Underwriter",
        },
      ],
      edges: [
        { id: "BK_F1", source: "BK_Start", target: "BK_Collect" },
        { id: "BK_F2", source: "BK_Collect", target: "BK_Assess" },
        { id: "BK_F3", source: "BK_Assess", target: "BK_RiskOk" },
        {
          id: "BK_F4",
          name: "Yes",
          source: "BK_RiskOk",
          target: "BK_RequestBureau",
        },
        {
          id: "BK_F5",
          name: "No",
          source: "BK_RiskOk",
          target: "BK_EndFail",
        },
        {
          id: "BK_F6",
          source: "BK_RequestBureau",
          target: "BK_Wait",
        },
        {
          id: "BK_F7",
          name: "Timeout",
          source: "BK_Wait",
          target: "BK_Timeout",
        },
        { id: "BK_F8", source: "BK_Wait", target: "BK_ReportReady" },
        { id: "BK_F9", source: "BK_Wait", target: "BK_BureauReject" },
        { id: "BK_F10", source: "BK_Timeout", target: "BK_EndFail" },
        {
          id: "BK_F11",
          name: "Failure",
          source: "BK_BureauReject",
          target: "BK_EndFail",
        },
        {
          id: "BK_F12",
          source: "BK_ReportReady",
          target: "BK_Decide",
        },
        { id: "BK_F13", source: "BK_Decide", target: "BK_EndOk" },
      ],
    },

    {
      id: "Process_Bureau",
      name: "Credit Bureau",
      participantId: "Participant_Bureau",
      participantName: "Credit Bureau",
      nodes: [
        {
          id: "CB_Start",
          type: "start",
          eventDefinition: "message",
        },
        {
          id: "CB_Pull",
          type: "task",
          name: "Pull Score",
          dataInputs: ["DS_CreditReports"],
        },
        {
          id: "CB_Fraud",
          type: "exclusiveGateway",
          name: "Fraud Flag?",
        },
        {
          id: "CB_Manual",
          type: "userTask",
          name: "Manual Review",
        },
        {
          id: "CB_Join",
          type: "exclusiveGateway",
        },
        {
          id: "CB_Reply",
          type: "subProcess",
          name: "Send Reply",
          multiInstance: { sequential: true },
          dataOutputs: ["DS_CreditReports"],
        },
        {
          id: "CB_End",
          type: "end",
        },
      ],
      edges: [
        { id: "CB_F1", source: "CB_Start", target: "CB_Pull" },
        { id: "CB_F2", source: "CB_Pull", target: "CB_Fraud" },
        {
          id: "CB_F3",
          name: "NO",
          source: "CB_Fraud",
          target: "CB_Join",
        },
        {
          id: "CB_F4",
          name: "Yes",
          source: "CB_Fraud",
          target: "CB_Manual",
        },
        { id: "CB_F5", source: "CB_Manual", target: "CB_Join" },
        { id: "CB_F6", source: "CB_Join", target: "CB_Reply" },
        { id: "CB_F7", source: "CB_Reply", target: "CB_End" },
      ],
    },
  ],

  messageFlows: [
    {
      id: "MF_Request",
      name: "Request Report",
      source: "BK_RequestBureau",
      target: "CB_Start",
    },
    {
      id: "MF_ReportReady",
      name: "Report Ready",
      source: "CB_Reply",
      target: "BK_ReportReady",
    },
    {
      id: "MF_BureauReject",
      source: "CB_Reply",
      target: "BK_BureauReject",
    },
  ],
};
