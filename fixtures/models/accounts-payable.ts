import type { ProcessModel } from "../../src/index";

/**
 * Full collaboration from diagram (9).bpmn — Accounts Payable sample.
 *
 * Two pools:
 * - Process Payable (Finance + CFO lanes)
 * - Schedule Payments
 *
 * Plus message flows and a shared Due Invoices data store.
 */
export const accountsPayable: ProcessModel = {
  id: "AccountsPayable",
  name: "Accounts Payable",

  dataStores: [
    {
      id: "DataStoreReference_05gbcij",
      name: "Due Invoices DB",
    },
  ],

  processes: [
    {
      id: "Process_1",
      name: "Process Payable",
      participantId: "Participant_ProcessPayable",
      participantName: "Process Payable",
      lanes: [
        { id: "Lane_Finance", name: "Finance" },
        { id: "Lane_CFO", name: "CFO" },
      ],
      nodes: [
        {
          id: "StartEvent_1",
          type: "start",
          laneId: "Lane_Finance",
        },
        {
          id: "Activity_0jansyu",
          type: "userTask",
          name: "Check Invoice",
          laneId: "Lane_Finance",
        },
        {
          id: "Activity_0rw6njl",
          type: "userTask",
          name: "Preliminarily Approve Payment",
          laneId: "Lane_CFO",
        },
        {
          id: "Gateway_1ausq5t",
          type: "exclusiveGateway",
          name: "Preliminarily Approved?",
          laneId: "Lane_CFO",
        },
        {
          id: "Activity_0il3f7r",
          type: "task",
          name: "Submit for Final Approval",
          laneId: "Lane_CFO",
          multiInstance: true,
          dataOutputs: ["DataStoreReference_05gbcij"],
        },
        {
          id: "Gateway_1krxaa4",
          type: "eventBasedGateway",
          laneId: "Lane_CFO",
        },
        {
          id: "Event_0uynyoe",
          type: "intermediateCatch",
          eventDefinition: "timer",
          laneId: "Lane_CFO",
        },
        {
          id: "Event_17o5it6",
          type: "intermediateCatch",
          eventDefinition: "message",
          laneId: "Lane_CFO",
        },
        {
          id: "Event_0e89umy",
          type: "intermediateCatch",
          name: "Rejected",
          eventDefinition: "message",
          laneId: "Lane_CFO",
        },
        {
          id: "Activity_0z205b9",
          type: "serviceTask",
          name: "Make Payment",
          laneId: "Lane_CFO",
        },
        {
          id: "Event_19ymtw0",
          type: "end",
          laneId: "Lane_CFO",
        },
        {
          id: "Event_0zymfw5",
          type: "end",
          name: "OK",
          laneId: "Lane_CFO",
        },
      ],
      edges: [
        {
          id: "Flow_0qg81oh",
          source: "StartEvent_1",
          target: "Activity_0jansyu",
        },
        {
          id: "Flow_0kz172h",
          source: "Activity_0jansyu",
          target: "Activity_0rw6njl",
        },
        {
          id: "Flow_00vet45",
          source: "Activity_0rw6njl",
          target: "Gateway_1ausq5t",
        },
        {
          id: "Flow_0zm69zv",
          name: "Yes",
          source: "Gateway_1ausq5t",
          target: "Activity_0il3f7r",
        },
        {
          id: "Flow_1qnp53v",
          name: "No",
          source: "Gateway_1ausq5t",
          target: "Event_19ymtw0",
        },
        {
          id: "Flow_1rkc8n3",
          source: "Activity_0il3f7r",
          target: "Gateway_1krxaa4",
        },
        {
          id: "Flow_0vdn4ia",
          name: "Timeout",
          source: "Gateway_1krxaa4",
          target: "Event_0uynyoe",
        },
        {
          id: "Flow_0vnzdfi",
          source: "Gateway_1krxaa4",
          target: "Event_17o5it6",
        },
        {
          id: "Flow_1jh5om5",
          source: "Gateway_1krxaa4",
          target: "Event_0e89umy",
        },
        {
          id: "Flow_1stinzd",
          source: "Event_0uynyoe",
          target: "Event_19ymtw0",
        },
        {
          id: "Flow_08pvbh5",
          name: "Failure",
          source: "Event_0e89umy",
          target: "Event_19ymtw0",
        },
        {
          id: "Flow_0vvqnyy",
          source: "Event_17o5it6",
          target: "Activity_0z205b9",
        },
        {
          id: "Flow_132qe2i",
          source: "Activity_0z205b9",
          target: "Event_0zymfw5",
        },
      ],
    },

    {
      id: "Process_0zv8j8l",
      name: "Schedule Payments",
      participantId: "Participant_SchedulePayments",
      participantName: "Schedule Payments",
      nodes: [
        {
          id: "Event_0tdgpqd",
          type: "start",
          eventDefinition: "timer",
        },
        {
          id: "Activity_03owdjy",
          type: "task",
          name: "Select Due Invoices",
          multiInstance: { sequential: true },
          dataInputs: ["DataStoreReference_05gbcij"],
        },
        {
          id: "Gateway_1a5gotf",
          type: "exclusiveGateway",
          name: "Overdraft?",
        },
        {
          id: "Activity_0to526z",
          type: "userTask",
          name: "Approve Payments",
        },
        {
          id: "Gateway_0ky7v6e",
          type: "exclusiveGateway",
        },
        {
          id: "Activity_0zmoiys",
          type: "subProcess",
          name: "Notify Payables",
          multiInstance: { sequential: true },
          dataOutputs: ["DataStoreReference_05gbcij"],
        },
        {
          id: "Event_046llah",
          type: "end",
        },
      ],
      edges: [
        {
          id: "Flow_0rvk2lh",
          source: "Event_0tdgpqd",
          target: "Activity_03owdjy",
        },
        {
          id: "Flow_0hf50zl",
          source: "Activity_03owdjy",
          target: "Gateway_1a5gotf",
        },
        {
          id: "Flow_0k37dmv",
          name: "Yes",
          source: "Gateway_1a5gotf",
          target: "Activity_0to526z",
        },
        {
          id: "Flow_0fykrrx",
          name: "NO",
          source: "Gateway_1a5gotf",
          target: "Gateway_0ky7v6e",
        },
        {
          id: "Flow_176akxz",
          source: "Activity_0to526z",
          target: "Gateway_0ky7v6e",
        },
        {
          id: "Flow_1he2781",
          source: "Gateway_0ky7v6e",
          target: "Activity_0zmoiys",
        },
        {
          id: "Flow_0srkk5t",
          source: "Activity_0zmoiys",
          target: "Event_046llah",
        },
      ],
    },
  ],

  messageFlows: [
    {
      id: "Flow_1ccsyr6",
      name: "Approved",
      source: "Activity_0zmoiys",
      target: "Event_17o5it6",
    },
    {
      id: "Flow_0wikx4u",
      source: "Activity_0zmoiys",
      target: "Event_0e89umy",
    },
  ],
};
