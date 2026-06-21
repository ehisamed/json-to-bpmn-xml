# json-to-bpmn-xml

[![npm version](https://img.shields.io/npm/v/json-to-bpmn-xml.svg)](https://www.npmjs.com/package/json-to-bpmn-xml) ![status](https://img.shields.io/badge/status-active%20development-yellow)
![build](https://img.shields.io/badge/build-passing-brightgreen)

Convert JSON workflow definitions into BPMN 2.0 XML.

## Features

- JSON → BPMN 2.0 XML conversion
- Supports tasks, gateways, events
- TypeScript support
- ESM module

## Supported Node Types

- start → Start Event
- end → End Event
- userTask → User Task
- serviceTask → Service Task
- exclusiveGateway → Exclusive Gateway

**Note**: This list is not final. Additional BPMN node types are planned and will be added in future releases.

## Installation

```bash
npm install json-to-bpmn-xml
```

## USAGE

```typescript
import { convert, type ProcessModel } from "json-to-bpmn-xml";

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
```

## OUTPUT

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="process_1_definitions" targetNamespace="http://www.omg.org/spec/BPMN/20100524/MODEL" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">
  <bpmn:process id="process_1" name="Simple Process" isExecutable="false">
    <bpmn:startEvent id="start">
      <bpmn:outgoing>e1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="task1" name="Do something">
      <bpmn:incoming>e1</bpmn:incoming>
      <bpmn:outgoing>e2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="end">
      <bpmn:incoming>e2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="e1" sourceRef="start" targetRef="task1"/>
    <bpmn:sequenceFlow id="e2" sourceRef="task1" targetRef="end"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="process_1">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="12" y="34" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="task1_di" bpmnElement="task1">
        <dc:Bounds x="168" y="12" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_di" bpmnElement="end">
        <dc:Bounds x="388" y="34" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="e1_di" bpmnElement="e1">
        <di:waypoint x="48" y="52"/>
        <di:waypoint x="168" y="52"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e2_di" bpmnElement="e2">
        <di:waypoint x="268" y="52"/>
        <di:waypoint x="388" y="52"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
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
