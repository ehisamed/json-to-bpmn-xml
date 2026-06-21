import { convert } from "src";
import { ProcessModel } from "./types/process";

const model: ProcessModel = {
  id: "process_1",
  name: "Simple Process",
  nodes: [
    { id: "start", type: "start" },
    { id: "task1", type: "userTask", name: "Do something" },
    { id: "end", type: "end" },
  ],
  edges: [
    { id: "e1", source: "start", target: "task1" },
    { id: "e2", source: "task1", target: "end" },
  ],
};

const xml = await convert(model);
console.log(xml);