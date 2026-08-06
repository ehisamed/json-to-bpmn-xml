import type { ProcessModel } from "../../src/index";

/**
 * Complex collaboration: Order Fulfillment.
 *
 * Pools:
 * - Customer Service (Agent + Supervisor lanes)
 * - Warehouse
 *
 * Features: event-based gateway (ship / cancel / timeout), message flows,
 * shared Orders data store, multi-instance pack task, exclusive bypass.
 */
export const orderFulfillment: ProcessModel = {
  id: "OrderFulfillment",
  name: "Order Fulfillment",

  dataStores: [
    {
      id: "DS_Orders",
      name: "Orders DB",
    },
  ],

  processes: [
    {
      id: "Process_CustomerService",
      name: "Customer Service",
      participantId: "Participant_CustomerService",
      participantName: "Customer Service",
      lanes: [
        { id: "Lane_Agent", name: "Agent" },
        { id: "Lane_Supervisor", name: "Supervisor" },
      ],
      nodes: [
        {
          id: "CS_Start",
          type: "start",
          laneId: "Lane_Agent",
        },
        {
          id: "CS_CaptureOrder",
          type: "userTask",
          name: "Capture Order",
          laneId: "Lane_Agent",
        },
        {
          id: "CS_Review",
          type: "userTask",
          name: "Review High-Value Order",
          laneId: "Lane_Supervisor",
        },
        {
          id: "CS_Approved",
          type: "exclusiveGateway",
          name: "Approved?",
          laneId: "Lane_Supervisor",
        },
        {
          id: "CS_SubmitWarehouse",
          type: "task",
          name: "Submit to Warehouse",
          laneId: "Lane_Supervisor",
          multiInstance: true,
          dataOutputs: ["DS_Orders"],
        },
        {
          id: "CS_Wait",
          type: "eventBasedGateway",
          laneId: "Lane_Supervisor",
        },
        {
          id: "CS_Shipped",
          type: "intermediateCatch",
          name: "Shipped",
          eventDefinition: "message",
          laneId: "Lane_Supervisor",
        },
        {
          id: "CS_Cancelled",
          type: "intermediateCatch",
          name: "Cancelled",
          eventDefinition: "message",
          laneId: "Lane_Supervisor",
        },
        {
          id: "CS_Timeout",
          type: "intermediateCatch",
          eventDefinition: "timer",
          laneId: "Lane_Supervisor",
        },
        {
          id: "CS_NotifyCustomer",
          type: "serviceTask",
          name: "Notify Customer",
          laneId: "Lane_Supervisor",
        },
        {
          id: "CS_EndOk",
          type: "end",
          name: "OK",
          laneId: "Lane_Supervisor",
        },
        {
          id: "CS_EndFail",
          type: "end",
          laneId: "Lane_Supervisor",
        },
      ],
      edges: [
        { id: "CS_F1", source: "CS_Start", target: "CS_CaptureOrder" },
        { id: "CS_F2", source: "CS_CaptureOrder", target: "CS_Review" },
        { id: "CS_F3", source: "CS_Review", target: "CS_Approved" },
        {
          id: "CS_F4",
          name: "Yes",
          source: "CS_Approved",
          target: "CS_SubmitWarehouse",
        },
        {
          id: "CS_F5",
          name: "No",
          source: "CS_Approved",
          target: "CS_EndFail",
        },
        {
          id: "CS_F6",
          source: "CS_SubmitWarehouse",
          target: "CS_Wait",
        },
        {
          id: "CS_F7",
          name: "Timeout",
          source: "CS_Wait",
          target: "CS_Timeout",
        },
        { id: "CS_F8", source: "CS_Wait", target: "CS_Shipped" },
        { id: "CS_F9", source: "CS_Wait", target: "CS_Cancelled" },
        { id: "CS_F10", source: "CS_Timeout", target: "CS_EndFail" },
        {
          id: "CS_F11",
          name: "Failure",
          source: "CS_Cancelled",
          target: "CS_EndFail",
        },
        {
          id: "CS_F12",
          source: "CS_Shipped",
          target: "CS_NotifyCustomer",
        },
        {
          id: "CS_F13",
          source: "CS_NotifyCustomer",
          target: "CS_EndOk",
        },
      ],
    },

    {
      id: "Process_Warehouse",
      name: "Warehouse",
      participantId: "Participant_Warehouse",
      participantName: "Warehouse",
      nodes: [
        {
          id: "WH_Start",
          type: "start",
          eventDefinition: "timer",
        },
        {
          id: "WH_PickOrders",
          type: "task",
          name: "Pick Due Orders",
          multiInstance: { sequential: true },
          dataInputs: ["DS_Orders"],
        },
        {
          id: "WH_Stock",
          type: "exclusiveGateway",
          name: "In Stock?",
        },
        {
          id: "WH_Backorder",
          type: "userTask",
          name: "Handle Backorder",
        },
        {
          id: "WH_Join",
          type: "exclusiveGateway",
        },
        {
          id: "WH_Ship",
          type: "subProcess",
          name: "Ship / Cancel Batch",
          multiInstance: { sequential: true },
          dataOutputs: ["DS_Orders"],
        },
        {
          id: "WH_End",
          type: "end",
        },
      ],
      edges: [
        { id: "WH_F1", source: "WH_Start", target: "WH_PickOrders" },
        { id: "WH_F2", source: "WH_PickOrders", target: "WH_Stock" },
        {
          id: "WH_F3",
          name: "Yes",
          source: "WH_Stock",
          target: "WH_Join",
        },
        {
          id: "WH_F4",
          name: "NO",
          source: "WH_Stock",
          target: "WH_Backorder",
        },
        { id: "WH_F5", source: "WH_Backorder", target: "WH_Join" },
        { id: "WH_F6", source: "WH_Join", target: "WH_Ship" },
        { id: "WH_F7", source: "WH_Ship", target: "WH_End" },
      ],
    },
  ],

  messageFlows: [
    {
      id: "MF_Shipped",
      name: "Shipped",
      source: "WH_Ship",
      target: "CS_Shipped",
    },
    {
      id: "MF_Cancelled",
      source: "WH_Ship",
      target: "CS_Cancelled",
    },
  ],
};
