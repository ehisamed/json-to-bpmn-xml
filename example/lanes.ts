import { convert, type ProcessModel } from "json-to-bpmn-xml";

const model: ProcessModel = {
  id: "Process_Test_Lanes",
  name: "Lane Test Process",

  lanes: [
    {
      id: "Lane_1",
      name: "Пользователь",
      nodeIds: [],
    },
    {
      id: "Lane_2",
      name: "Система",
      nodeIds: [],
    },
    {
      id: "Lane_3",
      name: "Внешние сервисы",
      nodeIds: [],
    },
  ],

  nodes: [
    // пусто специально — тест только lanes
  ],

  edges: [
    // пусто
  ],
};

const xml = await convert(model);
console.log(xml);