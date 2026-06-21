import { convert, type ProcessModel } from "json-to-bpmn-xml";

const model: ProcessModel = {
  id: "process_gateway",
  name: "Exclusive Gateway Example",
  nodes: [
    { id: "start", type: "start" },
    { id: "gateway1", type: "exclusiveGateway" },
    { id: "taskA", type: "userTask", name: "Task A" },
    { id: "taskB", type: "userTask", name: "Task B" },
    { id: "end", type: "end" }
  ],
  edges: [
    { id: "e1", source: "start", target: "gateway1" },
    { id: "e2", source: "gateway1", target: "taskA" },
    { id: "e3", source: "gateway1", target: "taskB" },
    { id: "e4", source: "taskA", target: "end" },
    { id: "e5", source: "taskB", target: "end" }
  ]
};

const xml = await convert(model);
console.log(xml);