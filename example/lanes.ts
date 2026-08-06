import { convert, type ProcessModel } from "../src/index";

const model: ProcessModel = {
  id: "Process_Test_Lanes",
  name: "Lane Test Process",

  lanes: [
    { id: "Lane_1", name: "Пользователь" },
    { id: "Lane_2", name: "Система" },
    { id: "Lane_3", name: "Внешние сервисы" },
  ],

  nodes: [
    { id: "start", type: "start", name: "Start", laneId: "Lane_1" },
    {
      id: "task_user",
      type: "userTask",
      name: "Заполнить форму",
      laneId: "Lane_1",
    },
    {
      id: "task_system",
      type: "serviceTask",
      name: "Проверить данные",
      laneId: "Lane_2",
    },
    {
      id: "task_ext",
      type: "serviceTask",
      name: "Вызов API",
      laneId: "Lane_3",
    },
    { id: "end", type: "end", name: "End", laneId: "Lane_1" },
  ],

  edges: [
    { id: "e1", source: "start", target: "task_user" },
    { id: "e2", source: "task_user", target: "task_system" },
    { id: "e3", source: "task_system", target: "task_ext" },
    { id: "e4", source: "task_ext", target: "end" },
  ],
};

const xml = await convert(model);
console.log(xml);
