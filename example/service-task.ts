import { convert, type ProcessModel } from "json-to-bpmn-xml";

const model: ProcessModel = {
  id: "process_service",
  name: "Service Task Example",
  nodes: [
    { id: "start", type: "start" },
    { id: "service1", type: "serviceTask", name: "Call service" },
    { id: "end", type: "end" }
  ],
  edges: [
    { id: "e1", source: "start", target: "service1" },
    { id: "e2", source: "service1", target: "end" }
  ]
};

const xml = await convert(model);
console.log(xml);