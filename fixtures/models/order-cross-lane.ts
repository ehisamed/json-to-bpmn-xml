import type { ProcessModel } from "../../src/index";

/**
 * Cross-lane order flow with a gateway:
 * Start → Place Order → Create Order → Payment OK? → Deliver → End
 *
 * Lanes: User → System → External Service
 */
export const orderCrossLane: ProcessModel = {
  id: "Process_Order_Cross_Lane",
  name: "Order — Cross-Lane Gateway",

  lanes: [
    { id: "Lane_User", name: "User" },
    { id: "Lane_System", name: "System" },
    { id: "Lane_Service", name: "External Service" },
  ],

  nodes: [
    {
      id: "Start_1",
      type: "start",
      name: "Start",
      laneId: "Lane_User",
    },
    {
      id: "Task_PlaceOrder",
      type: "userTask",
      name: "Place order",
      laneId: "Lane_User",
    },
    {
      id: "Task_CreateOrder",
      type: "serviceTask",
      name: "Create order",
      laneId: "Lane_System",
    },
    {
      id: "Gateway_Paid",
      type: "exclusiveGateway",
      name: "Payment successful?",
      laneId: "Lane_System",
    },
    {
      id: "Task_Deliver",
      type: "serviceTask",
      name: "Deliver",
      laneId: "Lane_Service",
    },
    {
      id: "End_1",
      type: "end",
      name: "End",
      laneId: "Lane_System",
    },
  ],

  edges: [
    { id: "Flow_1", source: "Start_1", target: "Task_PlaceOrder" },
    { id: "Flow_2", source: "Task_PlaceOrder", target: "Task_CreateOrder" },
    { id: "Flow_3", source: "Task_CreateOrder", target: "Gateway_Paid" },
    { id: "Flow_4", source: "Gateway_Paid", target: "Task_Deliver" },
    { id: "Flow_5", source: "Task_Deliver", target: "End_1" },
  ],
};
