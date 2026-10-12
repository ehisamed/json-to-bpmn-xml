# json-to-bpmn-xml

[![npm version](https://img.shields.io/npm/v/json-to-bpmn-xml.svg)](https://www.npmjs.com/package/json-to-bpmn-xml)
![status](https://img.shields.io/badge/status-active%20development-yellow)

**json-to-bpmn-xml** is an ESM JavaScript / TypeScript library that converts structured JSON workflow definitions into **formatted BPMN 2.0 XML with automatic diagram layout (BPMNDI)**. Define nodes, sequence flows, swimlanes and collaborating processes; `await convert(model)` returns an XML string with diagram shapes and edge waypoints.

Use it to generate BPMN diagrams from application data, export workflow configurations to modeling tools, or turn an AI-generated `ProcessModel` into BPMN XML. AI callers must produce the documented input structure; the library accepts structured models, not natural-language prompts.

The output includes both process elements and diagram coordinates for viewing in tools such as [bpmn.io](https://demo.bpmn.io) and Camunda Modeler. The library combines BPMN serialization through `bpmn-moddle` with ELK layout and custom orthogonal routing, including swimlanes, multiple pools, message flows and data associations.

**Scope:** generates diagrams, not workflow execution. Processes are emitted with `isExecutable="false"`; deployment to an engine requires engine-specific configuration. Input validation checks model structure and references, and repository tests parse the output with `bpmn-moddle`; these checks do not establish full BPMN semantic or XSD conformance. Event definitions describe event types; the current input API does not expose timer schedules or message correlation settings.

**JSON structure reference (full rules, nesting, types):**

- Docs index: [Documentation](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/docs/README.md)
- English: [Input model reference](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/docs/json-schema.en.md)
- Русский: [Структура входной модели](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/docs/json-schema.ru.md)

<img src="https://raw.githubusercontent.com/ehisamed/json-to-bpmn-xml/main/assets/readme-example.svg" alt="Simple BPMN process example" width="100%" />

## Features

- **JSON → BPMN 2.0 XML** via [`bpmn-moddle`](https://github.com/bpmn-io/bpmn-moddle)
- **Pretty-printed XML** with declaration, namespaces, and `xsi:schemaLocation`
- **Node types**: start/end, task variants, expanded/event/transaction subprocesses, standard gateways, intermediate catch/throw and boundary events
- **Event definitions**: timer, message, signal, conditional, error, escalation, terminate, cancel, compensation, link, and multiple definitions on one event
- **Multi-instance** loops with sequential/parallel behavior, cardinality, completion conditions, and behavior
- **Swimlanes** and **multi-pool collaborations** with message flows
- **Data stores and data objects** + data input/output associations
- **Text annotations, groups, and associations**
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
| `manualTask` | `bpmn:ManualTask` | |
| `sendTask` | `bpmn:SendTask` | optional `implementation` |
| `receiveTask` | `bpmn:ReceiveTask` | optional `implementation` |
| `scriptTask` | `bpmn:ScriptTask` | optional `script`, `scriptFormat` |
| `businessRuleTask` | `bpmn:BusinessRuleTask` | |
| `callActivity` | `bpmn:CallActivity` | optional `calledElement` |
| `subProcess` | `bpmn:SubProcess` / `bpmn:Transaction` | collapsed or nested; event / transaction specialization |
| `exclusiveGateway` | `bpmn:ExclusiveGateway` | |
| `parallelGateway` | `bpmn:ParallelGateway` | |
| `inclusiveGateway` | `bpmn:InclusiveGateway` | |
| `complexGateway` | `bpmn:ComplexGateway` | |
| `eventBasedGateway` | `bpmn:EventBasedGateway` | |
| `intermediateCatch` | `bpmn:IntermediateCatchEvent` | catch definitions |
| `intermediateThrow` | `bpmn:IntermediateThrowEvent` | throw definitions, including link events |
| `boundaryEvent` | `bpmn:BoundaryEvent` | requires `attachedTo` |

Common node options: `multiInstance`, `eventDefinition(s)`, `eventDefinitionOptions`, `dataInputs`, `dataOutputs`, `dataObjectInputs`, `dataObjectOutputs`, `laneId`.

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

`accountsPayable` is a complete Accounts Payable diagram example: **2 pools, 2 lanes, 19 nodes, 20 sequence flows, 2 message flows and 1 shared data store**. Finance checks an invoice, the CFO approves it, and a separate process schedules payments. The diagram includes an event-based gateway with timer and message catches, a collapsed subprocess, sequential / parallel multi-instance activities and DI colors.

[Full example walkthrough](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/docs/accounts-payable.md) · [JSON input](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/docs/examples/accounts-payable.json) · [Generated BPMN XML](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/docs/examples/accounts-payable.bpmn) · [Source fixture](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/fixtures/models/accounts-payable.ts)

![Accounts Payable BPMN diagram with Finance and CFO lanes, a Schedule Payments pool, message flows and a shared Due Invoices data store](https://raw.githubusercontent.com/ehisamed/json-to-bpmn-xml/main/assets/accounts-payable.png)

The complete JSON and generated XML are committed under `docs/examples/` and included in the npm package. The fixture demonstrates diagram generation; its timer and message definitions do not configure an executable payment workflow.

```bash
npm run local
# → converts fixtures/models/accounts-payable.ts
```

Swap the import in `scripts/local-run.ts` to try `incidentResponse`, `advancedOrder`, etc.

## Real BPMN cases

The repository includes runnable fixtures for the main patterns used in hand-built BPMN diagrams. Tests convert every exported fixture to XML and parse it back with `bpmn-moddle`, requiring zero parser warnings. PNG rendering is a separate local preview command.

### Invoice document flow

Use data objects when an activity creates or consumes a document:

```typescript
const model: ProcessModel = {
  id: "InvoiceProcess",
  dataObjects: [
    { id: "Invoice", name: "Invoice" },
    { id: "ValidatedInvoice", name: "Validated invoice" },
  ],
  nodes: [
    { id: "start", type: "start" },
    { id: "receive", type: "receiveTask", name: "Receive invoice", dataObjectOutputs: ["Invoice"] },
    { id: "validate", type: "serviceTask", name: "Validate", dataObjectInputs: ["Invoice"], dataObjectOutputs: ["ValidatedInvoice"] },
    { id: "end", type: "end" },
  ],
  edges: [
    { source: "start", target: "receive" },
    { source: "receive", target: "validate" },
    { source: "validate", target: "end" },
  ],
};
```

### Transaction with an event subprocess

Use `subProcessType: "transaction"` for an atomic operation and `subProcessType: "event"` for a recovery handler:

```typescript
const transaction: INode = {
  id: "Fulfill",
  type: "subProcess",
  name: "Fulfill order",
  subProcess: {
    subProcessType: "transaction",
    expanded: true,
    nodes: [
      { id: "txStart", type: "start" },
      { id: "reserve", type: "serviceTask", name: "Reserve stock" },
      { id: "txEnd", type: "end" },
    ],
    edges: [
      { source: "txStart", target: "reserve" },
      { source: "reserve", target: "txEnd" },
    ],
  },
};
```

### Compensation boundary event

Attach a compensation event to the activity it reverses and reference the undo activity explicitly:

```typescript
{
  id: "Compensate",
  type: "boundaryEvent",
  attachedTo: "ChargeCard",
  eventDefinition: "compensation",
  eventDefinitionOptions: {
    activityRef: "UndoCharge",
    waitForCompletion: false,
  },
}
```

### Multiple event and link handoff

An event can wait for more than one trigger. Link events use the same `linkName` on the throw and catch sides:

```typescript
{
  id: "WaitForAny",
  type: "intermediateCatch",
  eventDefinitions: ["timer", "message"],
},
// another node in the same nodes[] array
{
  id: "Jump",
  type: "intermediateThrow",
  eventDefinition: "link",
  eventDefinitionOptions: {
    linkName: "ReviewHandoff",
    linkDirection: "source",
  },
}
```

### Fixture coverage

| Fixture | Demonstrates |
| --- | --- |
| `accountsPayable` | two pools, lanes, messages, event-based gateway, data store |
| `dataObjects` | document input/output associations |
| `artifacts` | text annotation, group, association |
| `advancedSubprocesses` | transaction and event subprocesses |
| `controlEvents` | cancel, compensation, link, and multiple definitions |
| `complexGatewayLoops` | complex gateway, loop cardinality, completion condition |
| `compensation` | compensation `activityRef` and `waitForCompletion` |
| `linkEvents` | link throw/catch pair |

Run `npm run preview` to render every fixture to `.bpmn` and `.png`.

## Capability evidence

Use these links to verify claims against the input contract, implementation and tests. The schema reference is prose documentation, not a machine-readable JSON Schema validator.

| Capability | Implementation / input contract | Verification |
| --- | --- | --- |
| Node and event types, subprocesses, multi-instance | [Node types](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/src/types/node.ts), [node builder](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/src/builders/node.builder.ts) | [Complex fixtures](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/tests/complex-fixtures.test.ts) |
| Multi-pool collaboration, messages, shared data store | [Converter](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/src/converter/BpmnConverter.ts), [Accounts Payable fixture](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/fixtures/models/accounts-payable.ts) | [Accounts Payable test](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/tests/accounts-payable.test.ts) |
| Diagram layout and orthogonal routing | [Layout](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/src/elk.layout.ts), [edge router](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/src/utils/edge-router.ts) | [Routing cases](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/tests/routing-cases.test.ts), [layout tests](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/tests/advanced-order-layout.test.ts) |
| DI colors | [Color input type](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/src/types/di-color.ts) | [Color tests](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/tests/di-color.test.ts) |
| XML parsing for all exported fixtures | [Fixture index](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/fixtures/models/index.ts) | [Round-trip tests](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/tests/roundtrip.test.ts) |
| Model structure and reference checks | [Converter validation](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/src/converter/BpmnConverter.ts) | [Converter tests](https://github.com/ehisamed/json-to-bpmn-xml/blob/main/tests/BpmnConverter.test.ts) |

Run `npm test` for these checks and `npm run build` to build the published JavaScript and TypeScript declarations.

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
  IDataObject,
  ITextAnnotation,
  IGroup,
  IAssociation,
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
  dataObjects?: { id: string; name?: string; isCollection?: boolean }[];
  textAnnotations?: ITextAnnotation[];
  groups?: IGroup[];
  associations?: IAssociation[];
};

type INode = {
  id: string;
  type: NodeType;
  name?: string;
  laneId?: string;
  eventDefinition?: EventDefinition;
  eventDefinitions?: EventDefinition[];
  eventDefinitionOptions?: {
    activityRef?: string;
    waitForCompletion?: boolean;
    linkName?: string;
    linkDirection?: "source" | "target";
  };
  multiInstance?: boolean | {
    sequential?: boolean;
    loopCardinality?: string | number;
    completionCondition?: string;
    behavior?: "All" | "One" | "Complex";
  };
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

Render every fixture to `.bpmn` + `.png` (white padding, no artificial border). Layout/conversion is unchanged — padding is image-only.

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
- **Exclusive / parallel gateways** (diamond): docks only at vertices; fan-out uses compass sides (`top` / `right` / `bottom`) instead of stacking on one face
- **Small end events** (≤40px): several inbound flows share **one** left-center axis (same dock), so tips do not stack as separate arrowheads; mid-channels may still diverge before the merge
- **Event-based gateway**: timer catch above, first message below, further messages to the right (compass cluster); shared failure ends stack above the side message
- **Message flows / data associations**: bridge routing through the pool gap, avoiding data-store boxes
- Larger nodes with several docks on one side still use spaced slots on that face

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
| `gatewayFanoutJogs` | `gateway-fanout-jogs.ts` | Exclusive fan-out without detached stubs |
| `sharedEndDualIncoming` | `shared-end-dual-incoming.ts` | Two paths → one End (shared axis) |
| `gatewayLongLabel` | `gateway-long-label.ts` | Long gateway label placement |
| `gatewayMultiToSameEnd` | `gateway-multi-to-same-end.ts` | Rejected/Timeout → shared End |
| `gatewayYesNoCross` | `gateway-yes-no-cross.ts` | Yes right / No bottom on diamond |
| `gatewayJoinBypassTop` | `gateway-join-bypass-top.ts` | Bypass over top into join |

Complex fixtures (`accountsPayable`, `incidentResponse`) share patterns: swimlanes, `eventBasedGateway` + timer/message catches, exclusive bypass, message flows, and a shared data store. Routing regressions above are covered by `tests/routing-cases.test.ts`.

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
