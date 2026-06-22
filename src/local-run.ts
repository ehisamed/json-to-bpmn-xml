import { convert } from "src";
import { ProcessModel } from "./types/process";

const model: ProcessModel = {
  id: "Process_Auth",
  name: "Auth Process",
  lanes: [
    {
      id: "Lane_User",
      name: "Пользователь",
      nodeIds: ["StartEvent_1", "Task_Input"],
    },
    {
      id: "Lane_System",
      name: "Система",
      nodeIds: [
        "Task_Check",
        "Gateway_Valid",
        "Task_CreateSession",
        "Task_ShowError",
        "End_Success",
      ],
    },
  ],
  nodes: [
    { id: "StartEvent_1", type: "start", name: "Начало" },
    { id: "Task_Input", type: "userTask", name: "Ввести email и пароль" },
    { id: "Task_Check", type: "serviceTask", name: "Проверить учетные данные" },
    { id: "Gateway_Valid", type: "exclusiveGateway", name: "Действительны?" },
    { id: "Task_CreateSession", type: "serviceTask", name: "Создать сессию" },
    { id: "Task_ShowError", type: "serviceTask", name: "Показать ошибку" },
    { id: "End_Success", type: "end", name: "Успех" },
  ],
  edges: [
    { id: "Flow_1", source: "StartEvent_1", target: "Task_Input" },
    { id: "Flow_2", source: "Task_Input", target: "Task_Check" },
    { id: "Flow_3", source: "Task_Check", target: "Gateway_Valid" },
    {
      id: "Flow_4",
      source: "Gateway_Valid",
      target: "Task_CreateSession",
      name: "Да",
    },
    { id: "Flow_5", source: "Task_CreateSession", target: "End_Success" },
    {
      id: "Flow_6",
      source: "Gateway_Valid",
      target: "Task_ShowError",
      name: "Нет",
    },
    {
      id: "Flow_7",
      source: "Task_ShowError",
      target: "Task_Input",
      name: "Повторить ввод",
    },
  ],
};

const xml = await convert(model);
console.log(xml);
