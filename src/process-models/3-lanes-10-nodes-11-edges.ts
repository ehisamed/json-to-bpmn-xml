import { convert, type ProcessModel } from "../index";

// Flow:
// Start → Create Order → Payment → Gateway (paid?)
//   ├── yes → Pack Order → Deliver → End
//   └── no  → Retry Payment → End
//
// lanes: 3
// nodes: 10
// edges: 11
//
// features: gateway, loop, cross-lane, serviceTask, userTask

const model: ProcessModel = {
  id: "Process_Advanced_Order",
  name: "Advanced Order Process",

  lanes: [
    {
      id: "Lane_User",
      name: "Пользователь",
    },
    {
      id: "Lane_System",
      name: "Система",
    },
    {
      id: "Lane_Service",
      name: "Внешний сервис",
    },
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
      name: "Создать заказ",
      laneId: "Lane_User",
    },

    {
      id: "Task_Payment",
      type: "serviceTask",
      name: "Запрос оплаты",
      laneId: "Lane_Service",
    },

    {
      id: "Gateway_Paid",
      type: "exclusiveGateway",
      name: "Оплата успешна?",
      laneId: "Lane_System",
    },

    {
      id: "Task_RetryPayment",
      type: "userTask",
      name: "Повторить оплату",
      laneId: "Lane_User",
    },

    {
      id: "Task_Pack",
      type: "serviceTask",
      name: "Упаковка заказа",
      laneId: "Lane_System",
    },

    {
      id: "Task_Delivery",
      type: "serviceTask",
      name: "Доставка",
      laneId: "Lane_Service",
    },

    {
      id: "Task_Notify",
      type: "serviceTask",
      name: "Уведомление клиента",
      laneId: "Lane_System",
    },

    {
      id: "End_Success",
      type: "end",
      name: "Успешно",
      laneId: "Lane_User",
    },

    {
      id: "End_Failed",
      type: "end",
      name: "Отменено",
      laneId: "Lane_User",
    },
  ],

  edges: [
    {
      id: "F1",
      source: "Start_1",
      target: "Task_CreateOrder",
    },
    {
      id: "F2",
      source: "Task_CreateOrder",
      target: "Task_Payment",
    },
    {
      id: "F3",
      source: "Task_Payment",
      target: "Gateway_Paid",
    },

    // YES branch
    {
      id: "F4",
      source: "Gateway_Paid",
      target: "Task_Pack",
    },
    {
      id: "F5",
      source: "Task_Pack",
      target: "Task_Delivery",
    },
    {
      id: "F6",
      source: "Task_Delivery",
      target: "Task_Notify",
    },
    {
      id: "F7",
      source: "Task_Notify",
      target: "End_Success",
    },

    // NO branch (retry loop)
    {
      id: "F8",
      source: "Gateway_Paid",
      target: "Task_RetryPayment",
    },
    {
      id: "F9",
      source: "Task_RetryPayment",
      target: "Task_Payment",
    },

    // fail end shortcut (optional exit)
    {
      id: "F10",
      source: "Task_RetryPayment",
      target: "End_Failed",
    },
  ],
};

const xml = await convert(model);
console.log(xml);