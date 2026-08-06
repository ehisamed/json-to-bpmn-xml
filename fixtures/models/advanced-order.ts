import type { ProcessModel } from "../../src/index";

/**
 * Advanced order process used for layout / routing development.
 *
 * Flow:
 *   Start → Create Order → Payment Request → Payment successful?
 *     ├── yes → Pack → Deliver → Notify → Success
 *     └── no  → Retry Payment → (loop to Payment) | Cancelled
 */
export const advancedOrder: ProcessModel = {
  id: "Process_Advanced_Order",
  name: "Advanced Order Process",

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
      id: "Task_CreateOrder",
      type: "userTask",
      name: "Create order",
      laneId: "Lane_User",
    },
    {
      id: "Task_Payment",
      type: "serviceTask",
      name: "Payment request",
      laneId: "Lane_Service",
    },
    {
      id: "Gateway_Paid",
      type: "exclusiveGateway",
      name: "Payment successful?",
      laneId: "Lane_System",
    },
    {
      id: "Task_RetryPayment",
      type: "userTask",
      name: "Retry payment",
      laneId: "Lane_User",
    },
    {
      id: "Task_Pack",
      type: "serviceTask",
      name: "Pack order",
      laneId: "Lane_System",
    },
    {
      id: "Task_Delivery",
      type: "serviceTask",
      name: "Deliver",
      laneId: "Lane_Service",
    },
    {
      id: "Task_Notify",
      type: "serviceTask",
      name: "Notify customer",
      laneId: "Lane_System",
    },
    {
      id: "End_Success",
      type: "end",
      name: "Success",
      laneId: "Lane_User",
    },
    {
      id: "End_Failed",
      type: "end",
      name: "Cancelled",
      laneId: "Lane_User",
    },
  ],

  edges: [
    { id: "F1", source: "Start_1", target: "Task_CreateOrder" },
    { id: "F2", source: "Task_CreateOrder", target: "Task_Payment" },
    { id: "F3", source: "Task_Payment", target: "Gateway_Paid" },

    // Yes branch
    { id: "F4", source: "Gateway_Paid", target: "Task_Pack" },
    { id: "F5", source: "Task_Pack", target: "Task_Delivery" },
    { id: "F6", source: "Task_Delivery", target: "Task_Notify" },
    { id: "F7", source: "Task_Notify", target: "End_Success" },

    // No branch (retry loop)
    { id: "F8", source: "Gateway_Paid", target: "Task_RetryPayment" },
    { id: "F9", source: "Task_RetryPayment", target: "Task_Payment" },
    { id: "F10", source: "Task_RetryPayment", target: "End_Failed" },
  ],
};
