import { convert, type ProcessModel } from "../src/index";

const model: ProcessModel = {
  id: "Process_Lanes_Demo",
  name: "Lane Demo Process",

  lanes: [
    { id: "Lane_User", name: "User" },
    { id: "Lane_System", name: "System" },
    { id: "Lane_Service", name: "External Service" },
  ],

  nodes: [
    { id: "start", type: "start", name: "Start", laneId: "Lane_User" },
    {
      id: "task_user",
      type: "userTask",
      name: "Fill form",
      laneId: "Lane_User",
    },
    {
      id: "task_system",
      type: "serviceTask",
      name: "Validate data",
      laneId: "Lane_System",
    },
    {
      id: "task_ext",
      type: "serviceTask",
      name: "Call API",
      laneId: "Lane_Service",
    },
    { id: "end", type: "end", name: "End", laneId: "Lane_User" },
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
