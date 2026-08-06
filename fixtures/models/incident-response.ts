import type { ProcessModel } from "../../src/index";

/**
 * Complex collaboration: Incident Response.
 *
 * Pools:
 * - Support Desk (L1 + L2 lanes)
 * - Operations
 *
 * Features: timer-driven ops sweep, event-based wait for resolve / escalate /
 * timeout, message flows, Incidents data store, parallel multi-instance notify.
 */
export const incidentResponse: ProcessModel = {
  id: "IncidentResponse",
  name: "Incident Response",

  dataStores: [
    {
      id: "DS_Incidents",
      name: "Incidents DB",
    },
  ],

  processes: [
    {
      id: "Process_Support",
      name: "Support Desk",
      participantId: "Participant_Support",
      participantName: "Support Desk",
      lanes: [
        { id: "Lane_L1", name: "L1" },
        { id: "Lane_L2", name: "L2" },
      ],
      nodes: [
        {
          id: "SP_Start",
          type: "start",
          laneId: "Lane_L1",
        },
        {
          id: "SP_Triage",
          type: "userTask",
          name: "Triage Ticket",
          laneId: "Lane_L1",
        },
        {
          id: "SP_Classify",
          type: "userTask",
          name: "Classify Severity",
          laneId: "Lane_L2",
        },
        {
          id: "SP_Critical",
          type: "exclusiveGateway",
          name: "Critical?",
          laneId: "Lane_L2",
        },
        {
          id: "SP_OpenIncident",
          type: "task",
          name: "Open Incident",
          laneId: "Lane_L2",
          multiInstance: true,
          dataOutputs: ["DS_Incidents"],
        },
        {
          id: "SP_Wait",
          type: "eventBasedGateway",
          laneId: "Lane_L2",
        },
        {
          id: "SP_Resolved",
          type: "intermediateCatch",
          name: "Resolved",
          eventDefinition: "message",
          laneId: "Lane_L2",
        },
        {
          id: "SP_Escalated",
          type: "intermediateCatch",
          name: "Escalated",
          eventDefinition: "message",
          laneId: "Lane_L2",
        },
        {
          id: "SP_Timeout",
          type: "intermediateCatch",
          eventDefinition: "timer",
          laneId: "Lane_L2",
        },
        {
          id: "SP_Close",
          type: "serviceTask",
          name: "Close Ticket",
          laneId: "Lane_L2",
        },
        {
          id: "SP_EndOk",
          type: "end",
          name: "OK",
          laneId: "Lane_L2",
        },
        {
          id: "SP_EndFail",
          type: "end",
          laneId: "Lane_L2",
        },
      ],
      edges: [
        { id: "SP_F1", source: "SP_Start", target: "SP_Triage" },
        { id: "SP_F2", source: "SP_Triage", target: "SP_Classify" },
        { id: "SP_F3", source: "SP_Classify", target: "SP_Critical" },
        {
          id: "SP_F4",
          name: "Yes",
          source: "SP_Critical",
          target: "SP_OpenIncident",
        },
        {
          id: "SP_F5",
          name: "No",
          source: "SP_Critical",
          target: "SP_EndFail",
        },
        {
          id: "SP_F6",
          source: "SP_OpenIncident",
          target: "SP_Wait",
        },
        {
          id: "SP_F7",
          name: "Timeout",
          source: "SP_Wait",
          target: "SP_Timeout",
        },
        { id: "SP_F8", source: "SP_Wait", target: "SP_Resolved" },
        { id: "SP_F9", source: "SP_Wait", target: "SP_Escalated" },
        { id: "SP_F10", source: "SP_Timeout", target: "SP_EndFail" },
        {
          id: "SP_F11",
          name: "Failure",
          source: "SP_Escalated",
          target: "SP_EndFail",
        },
        { id: "SP_F12", source: "SP_Resolved", target: "SP_Close" },
        { id: "SP_F13", source: "SP_Close", target: "SP_EndOk" },
      ],
    },

    {
      id: "Process_Ops",
      name: "Operations",
      participantId: "Participant_Ops",
      participantName: "Operations",
      nodes: [
        {
          id: "OP_Start",
          type: "start",
          eventDefinition: "timer",
        },
        {
          id: "OP_Scan",
          type: "task",
          name: "Scan Open Incidents",
          multiInstance: { sequential: true },
          dataInputs: ["DS_Incidents"],
        },
        {
          id: "OP_Pager",
          type: "exclusiveGateway",
          name: "Needs Pager?",
        },
        {
          id: "OP_Page",
          type: "userTask",
          name: "Page On-Call",
        },
        {
          id: "OP_Join",
          type: "exclusiveGateway",
        },
        {
          id: "OP_Notify",
          type: "subProcess",
          name: "Notify Support",
          multiInstance: true,
          dataOutputs: ["DS_Incidents"],
        },
        {
          id: "OP_End",
          type: "end",
        },
      ],
      edges: [
        { id: "OP_F1", source: "OP_Start", target: "OP_Scan" },
        { id: "OP_F2", source: "OP_Scan", target: "OP_Pager" },
        {
          id: "OP_F3",
          name: "Yes",
          source: "OP_Pager",
          target: "OP_Page",
        },
        {
          id: "OP_F4",
          name: "NO",
          source: "OP_Pager",
          target: "OP_Join",
        },
        { id: "OP_F5", source: "OP_Page", target: "OP_Join" },
        { id: "OP_F6", source: "OP_Join", target: "OP_Notify" },
        { id: "OP_F7", source: "OP_Notify", target: "OP_End" },
      ],
    },
  ],

  messageFlows: [
    {
      id: "MF_Resolved",
      name: "Resolved",
      source: "OP_Notify",
      target: "SP_Resolved",
    },
    {
      id: "MF_Escalated",
      source: "OP_Notify",
      target: "SP_Escalated",
    },
  ],
};
