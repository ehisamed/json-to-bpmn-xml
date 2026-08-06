# json-to-bpmn-xml

[![npm version](https://img.shields.io/npm/v/json-to-bpmn-xml.svg)](https://www.npmjs.com/package/json-to-bpmn-xml)
![status](https://img.shields.io/badge/status-active%20development-yellow)
![build](https://img.shields.io/badge/build-passing-brightgreen)

Convert JSON workflow definitions into **valid, formatted BPMN 2.0 XML** with diagram layout (BPMNDI).

The output opens cleanly in tools like [bpmn.io](https://demo.bpmn.io) / Camunda Modeler: process semantics, swimlanes, and orthogonal sequence flows.

**JSON structure reference (full rules, nesting, types):**

- Docs index: [docs/README.md](./docs/README.md)
- English: [docs/json-schema.en.md](./docs/json-schema.en.md)
- Русский: [docs/json-schema.ru.md](./docs/json-schema.ru.md)

<img src="./assets/advanced-order-process.png" alt="Advanced Order Process with lanes" width="100%" />

## Features

- **JSON → BPMN 2.0 XML** via [`bpmn-moddle`](https://github.com/bpmn-io/bpmn-moddle)
- **Pretty-printed XML** with declaration, namespaces, and `xsi:schemaLocation`
- **Node types**: start/end, task, user/service task, subProcess, exclusive / parallel / event-based gateways, intermediate catch (timer/message)
- **Event definitions** on start & intermediate catch (`timer` | `message`)
- **Multi-instance** loops (parallel or sequential)
- **Swimlanes** and **multi-pool collaborations** with message flows
- **Data stores** + data input/output associations
- **Auto layout** (ELK + orthogonal edge routing, including event-gateway “compass” clusters)
- **DI colors** (`bioc` + `color` extensions, as in bpmn.io)
- **Validation** of the input model
- **TypeScript** types + **ESM**

## Supported Node Types

| JSON `type` | BPMN element | Notes |
| --- | --- | --- |
| `start` | `bpmn:StartEvent` | optional `eventDefinition: "timer" \| "message"` |
| `end` | `bpmn:EndEvent` | |
| `task` | `bpmn:Task` | generic task |
| `userTask` | `bpmn:UserTask` | |
| `serviceTask` | `bpmn:ServiceTask` | |
| `subProcess` | `bpmn:SubProcess` | collapsed (empty body) |
| `exclusiveGateway` | `bpmn:ExclusiveGateway` | |
| `parallelGateway` | `bpmn:ParallelGateway` | |
| `eventBasedGateway` | `bpmn:EventBasedGateway` | |
| `intermediateCatch` | `bpmn:IntermediateCatchEvent` | requires `eventDefinition` |

Common node options: `multiInstance`, `dataInputs`, `dataOutputs`, `laneId`.

## Installation

```bash
npm install json-to-bpmn-xml
```

## Quick start

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
// → formatted BPMN 2.0 XML string
```

Without lanes, the diagram plane is bound to the **process** (no collaboration).

## Swimlanes (lanes)

Assign each node to a lane with `laneId`. The converter will generate:

- `bpmn:laneSet` / `bpmn:lane` with `flowNodeRef`
- `bpmn:collaboration` + `bpmn:participant` (pool)
- DI shapes for participant and lanes (lanes are inset so pool and lane titles do not overlap)
- Orthogonal cross-lane sequence flows

`laneId` is **input-only** — it is never written as an attribute on flow nodes in the XML.

```typescript
import { convert, type ProcessModel } from "json-to-bpmn-xml";

const model: ProcessModel = {
  id: "Process_Test_Lanes",
  name: "Lane Test Process",
  lanes: [
    { id: "Lane_1", name: "User" },
    { id: "Lane_2", name: "System" },
    { id: "Lane_3", name: "External Service" },
  ],
  nodes: [
    { id: "start", type: "start", name: "Start", laneId: "Lane_1" },
    { id: "task_user", type: "userTask", name: "Fill form", laneId: "Lane_1" },
    { id: "task_system", type: "serviceTask", name: "Validate data", laneId: "Lane_2" },
    { id: "task_ext", type: "serviceTask", name: "Call API", laneId: "Lane_3" },
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
```

### Advanced example (gateway + loop + cross-lane)

Use the `advancedOrder` fixture (single pool, three lanes, retry loop):

```typescript
import { convert } from "json-to-bpmn-xml";
import { advancedOrder } from "./fixtures/models"; // in this repo

const xml = await convert(advancedOrder);
```

### Collaboration example (two pools)

`accountsPayable` is the full Accounts Payable sample: Finance + CFO lanes, Schedule Payments pool, event-based gateway, message flows, and a shared data store.

```bash
npm run local
# → converts fixtures/models/accounts-payable.ts
```

Swap the import in `scripts/local-run.ts` to try `incidentResponse`, `advancedOrder`, etc.

## API

### `convert(model): Promise<string>`

Main entry. Builds a BPMN model, computes layout, serializes and formats XML.

### `BpmnConverter`

Class API if you prefer an instance:

```typescript
import { BpmnConverter } from "json-to-bpmn-xml";

const converter = new BpmnConverter();
const xml = await converter.convert(model);
```

### Exported types

```typescript
import type {
  ProcessModel,
  IProcessDef,
  INode,
  IEdge,
  ILane,
  IMessageFlow,
  IDataStore,
  DiColor,
  NodeType,
  EventDefinition,
} from "json-to-bpmn-xml";
```

## ProcessModel

Supports **simple** (one process) and **collaboration** (many pools) shapes.

> Full field-by-field rules, nesting, validation, and examples:  
> **[English](./docs/json-schema.en.md)** · **[Русский](./docs/json-schema.ru.md)**

```typescript
type ProcessModel = {
  id: string;
  name?: string;

  // --- Simple mode (single process) ---
  lanes?: { id: string; name: string }[];
  nodes?: INode[];
  edges?: IEdge[];

  // --- Collaboration mode ---
  processes?: {
    id: string;
    name?: string;
    participantId?: string;
    participantName?: string;
    lanes?: { id: string; name: string }[];
    nodes: INode[];
    edges: IEdge[];
  }[];
  messageFlows?: { id?: string; source: string; target: string; name?: string }[];
  dataStores?: { id: string; name?: string }[];
};

type INode = {
  id: string;
  type: NodeType;
  name?: string;
  laneId?: string;
  eventDefinition?: "timer" | "message";
  multiInstance?: boolean | { sequential?: boolean };
  dataInputs?: string[];  // data store ids
  dataOutputs?: string[]; // data store ids
  /** bpmn.io bioc + OMG color on the DI shape */
  color?: { stroke?: string; fill?: string };
};

// dataStores[] also accept optional `color`
```

### DI colors (`bioc` / `color`)

Optional `color` on nodes and data stores is written onto `bpmndi:BPMNShape`:

```typescript
{ id: "start", type: "start", color: { stroke: "#0d4372", fill: "#bbdefb" } }
```

```xml
<bpmndi:BPMNShape … bioc:stroke="#0d4372" bioc:fill="#bbdefb"
  color:background-color="#bbdefb" color:border-color="#0d4372">
```

Namespaces `xmlns:bioc` / `xmlns:color` are added only when at least one color is present.

### Local run

```bash
npm run local
# → converts fixtures/models/accounts-payable.ts by default
```

Edit `scripts/local-run.ts` to import any fixture from `fixtures/models`.

### Fixture PNG previews

Render every fixture to `.bpmn` + framed `.png` (white background, padding, thin border). Layout/conversion is unchanged — framing is image-only.

```bash
npm run preview:setup   # once: install Puppeteer Chrome
npm run preview         # → previews/YYYY-MM-DD_HH-mm-ss/*.bpmn + *.png
```

`previews/` is gitignored. Details: [docs/README.md](./docs/README.md#fixture-previews-png).

## Output

### Simple process (no lanes)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="process_1_definitions"
  targetNamespace="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd">
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
      <!-- shapes + orthogonal edges -->
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
```

### With lanes

Root elements include **collaboration** (pool) and **process** with `laneSet`:

```xml
<bpmn:collaboration id="Collab_Process_Test_Lanes">
  <bpmn:participant
    id="Participant_Process_Test_Lanes"
    name="Lane Test Process"
    processRef="Process_Test_Lanes"/>
</bpmn:collaboration>

<bpmn:process id="Process_Test_Lanes" name="Lane Test Process" isExecutable="false">
  <bpmn:laneSet id="LaneSet_1">
    <bpmn:lane id="Lane_1" name="User">
      <bpmn:flowNodeRef>start</bpmn:flowNodeRef>
      <bpmn:flowNodeRef>task_user</bpmn:flowNodeRef>
      <bpmn:flowNodeRef>end</bpmn:flowNodeRef>
    </bpmn:lane>
    <!-- … -->
  </bpmn:laneSet>
  <!-- flow nodes + sequenceFlows -->
</bpmn:process>
```

Diagram plane is bound to the **collaboration**. Participant and lane shapes use `isHorizontal="true"`; lane bounds start after the pool header strip so titles do not collide.

## Layout notes

| Mode | Behavior |
| ---- | -------- |
| **No lanes** | ELK layered layout; plane → process |
| **With lanes** | ELK for horizontal order; column packing in lanes; plane → collaboration |
| **Multi-pool** | Pools stacked vertically; data stores sit in the inter-pool gap |

**Edge routing** (generic heuristics, not diagram-specific):

- Orthogonal (90°) waypoints only
- Forward cross-lane links: side docks (`right` → `left`) or vertical drop when aligned
- Long skip / bypass edges: clear channel above obstacles, enter target from the **top**
- Backward loops: route around stacked nodes; approach the dock **from outside** the shape
- **Event-based gateway**: timer catch above, first message below, further messages to the right (compass cluster); shared failure ends stack above the side message
- **Message flows / data associations**: bridge routing through the pool gap, avoiding data-store boxes
- Multiple flows on the same side of a node may share that side (valid BPMN)

Coordinates are deterministic for a given model (good for tests / snapshots). Exact numbers can change if layout constants or ELK options change.

## Examples in the repo

```bash
npm run example:simple    # process without lanes
npm run example:lanes     # three lanes
npm run example:gateway   # exclusive gateway
npm run example:service   # service task
npm run example:accounts  # accounts payable collaboration
npm run local             # default: accounts-payable fixture (edit script to switch)
npm run preview:setup     # once: Puppeteer Chrome for PNG previews
npm run preview           # all fixtures → previews/<timestamp>/*.bpmn + *.png
npm test
npm run build
```

| Path | Description |
| ---- | ----------- |
| `examples/` | Runnable demo scripts |
| `fixtures/models/` | Reusable `ProcessModel` fixtures, for local-run, preview, and tests |
| `scripts/local-run.ts` | Dev runner — import any fixture and print XML |
| `scripts/render-fixtures.ts` | Preview runner — convert all fixtures to BPMN + PNG |
| `previews/` | Generated preview folders (gitignored) |
| `docs/` | JSON schema docs + [docs index](./docs/README.md) |
| `tests/` | Vitest suite |
| `src/` | Library source (published via `dist/`) |

### Fixtures (`fixtures/models/`)

| Export | File | Purpose |
| ------ | ---- | ------- |
| `lanesSingleNode` | `lanes-single-node.ts` | Three lanes, one start event |
| `lanesSimpleFlow` | `lanes-simple-flow.ts` | Start → task → end in one lane |
| `orderCrossLane` | `order-cross-lane.ts` | Cross-lane flow with gateway |
| `advancedOrder` | `advanced-order.ts` | Single-pool demo (retry loop, packing, delivery) |
| `accountsPayable` | `accounts-payable.ts` | **Complex**: 2 pools, lanes, event gateway, messages, data store |
| `incidentResponse` | `incident-response.ts` | **Complex**: Support Desk + Operations collaboration |
| `processPayable` | `process-payable.ts` | Simplified single-pool payable slice |
| `schedulePayments` | `schedule-payments.ts` | Simplified schedule-payments slice |
| `exclusiveFanoutUpForward` | `exclusive-fanout-up-forward.ts` | Exclusive GW fan-out (up + forward) |
| `crossLaneSparseDrop` | `cross-lane-sparse-drop.ts` | Sparse cross-lane drop layout |
| `parallelSplitJoin` | `parallel-split-join.ts` | Parallel split / join |
| `exclusiveThreeWay` | `exclusive-three-way.ts` | Three-way exclusive with labels |
| `timerStartSimple` | `timer-start-simple.ts` | Timer start |
| `messageStartSimple` | `message-start-simple.ts` | Message start |
| `subprocessAndMultiInstance` | `subprocess-and-multi-instance.ts` | Collapsed subProcess + multi-instance |

Complex fixtures (`accountsPayable`, `incidentResponse`) share patterns: swimlanes, `eventBasedGateway` + timer/message catches, exclusive bypass, message flows, and a shared data store.

Switch the model in `scripts/local-run.ts`:

```typescript
import { convert } from "../src/index";
import { accountsPayable } from "../fixtures/models";
// import { incidentResponse } from "../fixtures/models";
// import { advancedOrder } from "../fixtures/models";

const xml = await convert(accountsPayable);
console.log(xml);
```

Or render all fixtures as images:

```bash
npm run preview
```

## Built With

- [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle) — BPMN model + XML serialization
- [elkjs](https://github.com/kieler/elkjs) — graph layout (layered)
- [xml-formatter](https://github.com/chrisbottin/xml-formatter) — readable XML output
- [bpmn-to-image](https://github.com/bpmn-io/bpmn-to-image) — fixture PNG previews (dev)

## License

Use under the terms of the [Apache-2.0](https://opensource.org/license/Apache-2.0).
