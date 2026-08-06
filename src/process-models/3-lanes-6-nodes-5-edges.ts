import { convert, type ProcessModel } from "../index";

// Flow: Start → User Task → Service Task → Exclusive Gateway → Service Task → End
// Пользователь → Система → Внешний сервис → Система
//
// lanes: 3
// nodes: 6
// edges: 5
//
// features: userTask, serviceTask, exclusiveGateway, cross-lane flow

const model: ProcessModel = {
  id: "Process_Order_Flow",
  name: "Order Process",

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
      id: "Task_1",
      type: "userTask",
      name: "Оформить заказ",
      laneId: "Lane_User",
    },
    {
      id: "Task_2",
      type: "serviceTask",
      name: "Создать заказ",
      laneId: "Lane_System",
    },
    {
      id: "Gateway_1",
      type: "exclusiveGateway",
      name: "Оплата успешна?",
      laneId: "Lane_System",
    },
    {
      id: "Task_3",
      type: "serviceTask",
      name: "Доставка",
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
    {
      id: "Flow_1",
      source: "Start_1",
      target: "Task_1",
    },
    {
      id: "Flow_2",
      source: "Task_1",
      target: "Task_2",
    },
    {
      id: "Flow_3",
      source: "Task_2",
      target: "Gateway_1",
    },
    {
      id: "Flow_4",
      source: "Gateway_1",
      target: "Task_3",
    },
    {
      id: "Flow_5",
      source: "Task_3",
      target: "End_1",
    },
  ],
};

const xml = await convert(model);
console.log(xml);