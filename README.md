# json-to-bpmn-xml

Convert JSON workflow definitions into BPMN 2.0 XML.

## Features

- JSON → BPMN 2.0 XML conversion
- Supports tasks, gateways, events
- TypeScript support
- ESM module

## Installation

```bash
npm install json-to-bpmn-xml
```

## USAGE

```typescript
import { convert } from "json-to-bpmn-xml";

const model = {
  id: "process_1",
  name: "Simple Process",
  nodes: [
    { id: "start", type: "start" },
    { id: "task1", type: "userTask", name: "Do something" },
    { id: "end", type: "end" }
  ],
  edges: [
    { id: "e1", source: "start", target: "task1" },
    { id: "e2", source: "task1", target: "end" }
  ]
};

const xml = await convert(model);

console.log(xml);
```

## ProcessModel 

```typescript
type ProcessModel = {
  id: string;
  name: string;
  nodes: {
    id: string;
    type: "start" | "end" | "userTask" | "serviceTask" | "exclusiveGateway";
    name?: string;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
  }[];
};
```

## Built With

This library is built on top of [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle) and [xml-formatter](https://github.com/chrisbottin/xml-formatter)

## License

Use under the terms of the [Apache-2.0](https://opensource.org/license/Apache-2.0).