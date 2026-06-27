import { convert, ProcessModel } from "src";

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
  ],

  edges: [],
};

const xml = await convert(model);
console.log(xml);