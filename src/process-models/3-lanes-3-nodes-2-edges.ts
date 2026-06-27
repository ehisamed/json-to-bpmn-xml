import { convert, ProcessModel } from "src";

// Start → User Task → End
const model: ProcessModel = {
  id: "Process_Test_Lanes",
  name: "Lane Test Process",

  lanes: [
    {
      id: "Lane_1",
      name: "Пользователь",
    },
    {
      id: "Lane_2",
      name: "Система",
    },
    {
      id: "Lane_3",
      name: "Внешние сервисы",
    },
  ],

  nodes: [
    {
      id: "Start_1",
      type: "start",
      name: "Начало",
      laneId: "Lane_1",
    },
    {
      id: "Task_1",
      type: "userTask",
      name: "Заполнить форму",
      laneId: "Lane_1",
    },
    {
      id: "End_1",
      type: "end",
      name: "Конец",
      laneId: "Lane_1",
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
      target: "End_1",
    },
  ],
};

const xml = await convert(model);
console.log(xml);