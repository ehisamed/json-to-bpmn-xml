# ProcessModel JSON — structure reference (English)

This document describes the **input JSON** accepted by `convert(model)` / `BpmnConverter.convert(model)`.

The converter turns this structure into **valid BPMN 2.0 XML** (semantics + diagram DI). Coordinates and waypoints are computed automatically — you do **not** put layout geometry in the JSON.

- Russian version: [json-schema.ru.md](./json-schema.ru.md)
- TypeScript source of truth: `src/types/`

---

## 1. Two modes of the same root object

`ProcessModel` supports two shapes. Internally they are normalized to the same form (`processes[]` + optional message flows, data references, and artifacts).

| Mode | When to use | What you fill |
| ---- | ----------- | ------------- |
| **Simple** | One process, optional lanes | Top-level `nodes`, `edges`, optional `lanes` |
| **Collaboration** | Several pools and/or message flows | Top-level `processes[]`, optional `messageFlows`, `dataStores` |

**Rule:** if `processes` is present and non-empty, **collaboration mode wins**. Top-level `nodes` / `edges` / `lanes` are ignored in that case.

**Rule:** if `processes` is missing/empty, you **must** provide top-level `nodes` (at least one). Otherwise conversion throws.

```text
ProcessModel
├── id (required)
├── name?
│
├── [Simple]
│   ├── lanes?
│   ├── nodes?
│   └── edges?
│
└── [Collaboration]
    ├── processes?
    ├── messageFlows?
    ├── dataStores?
    ├── dataObjects?
    ├── textAnnotations? / groups?
    └── associations?
```

---

## 2. Root: `ProcessModel`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | `string` | **yes** | Root id. Used for definitions id (`${id}_definitions`) and, in simple mode, as the process id. Must be unique in your domain; preferred: letters, digits, `_`. |
| `name` | `string` | no | Human-readable title. In simple mode also used as process/participant name. |
| `lanes` | `ILane[]` | no | Simple mode only. Swimlanes of the single process. |
| `nodes` | `INode[]` | simple: **yes*** | Simple mode flow nodes. *Required when `processes` is absent. |
| `edges` | `IEdge[]` | no | Simple mode sequence flows. Defaults to `[]`. |
| `processes` | `IProcessDef[]` | collab: **yes*** | One entry = one pool/process. *Required for multi-pool models. |
| `messageFlows` | `IMessageFlow[]` | no | Dashed message links **between processes**. |
| `dataStores` | `IDataStore[]` | no | Shared data store references (cylinders). |
| `dataObjects` | `IDataObject[]` | no | Document/data object references. |
| `textAnnotations` | `ITextAnnotation[]` | no | Text annotations. |
| `groups` | `IGroup[]` | no | BPMN group artifacts. |
| `associations` | `IAssociation[]` | no | Associations between node/artifact ids. |

### Why two modes?

- **Simple** keeps small examples short (no nesting under `processes`).
- **Collaboration** matches real BPMN: each pool is its own process; message flows cannot live inside a single process’s `edges`.

### What is **not** in JSON

- No `x` / `y` / waypoints — layout is automatic.
- No raw BPMN XML fragments.
- No `laneId` attribute on emitted flow nodes (lanes are only via `laneSet` / `flowNodeRef`).
- Nested subprocess contents use `subProcess.nodes` / `subProcess.edges`; set `expanded: true` for expanded DI.
- `subProcessType: "event"` emits an event subprocess; `subProcessType: "transaction"` emits a transaction subprocess.

---

## 3. Process: `IProcessDef` (collaboration mode)

One object in `processes[]` = one BPMN process + one participant (pool).

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | `string` | **yes** | Process id (`bpmn:process/@id`). Unique among processes. |
| `name` | `string` | no | Process name. |
| `participantId` | `string` | no | Pool element id. Default: `Participant_${process.id}`. |
| `participantName` | `string` | no | Pool title shown on the diagram. Default: process `name`. |
| `lanes` | `ILane[]` | no | Horizontal swimlanes inside this pool. |
| `nodes` | `INode[]` | **yes** | At least one node. Ids unique **across all processes**. |
| `edges` | `IEdge[]` | **yes** (array) | Sequence flows; may be empty `[]`, but must be an array. |

### Nesting rules

```text
processes[]
  └── process
        ├── lanes[]          ← optional; only ids referenced by node.laneId
        ├── nodes[]          ← belong ONLY to this process
        └── edges[]          ← source/target MUST be nodes of THIS process
```

- An `edge` **cannot** connect nodes from two different processes → use `messageFlows`.
- A `laneId` on a node must refer to a lane declared in **the same** process.
- If the process has `lanes`, nodes without `laneId` are still valid BPMN-wise but will not appear in any lane’s `flowNodeRef` (prefer always setting `laneId` when lanes exist).

### When collaboration / pool DI is created

Collaboration is emitted when any of these is true:

1. More than one process, or
2. At least one `messageFlow`, or
3. At least one process has `lanes`.

Otherwise (simple process, no lanes) the diagram plane binds to the **process**, not a collaboration.

---

## 4. Lane: `ILane`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | `string` | **yes** | Referenced by `node.laneId`. Unique within the process. |
| `name` | `string` | **yes** | Label drawn in the lane header. |

**Why lanes are separate from nodes:** in BPMN, lanes are a partition of the process, not properties of the XML element itself. The converter builds `laneSet` and puts `flowNodeRef` for each node with matching `laneId`.

---

## 5. Node: `INode`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | `string` | **yes** | Unique across **all** processes in the model. |
| `type` | `NodeType` | **yes** | See table below. |
| `name` | `string` | no | Visible label. |
| `laneId` | `string` | no | Must exist in the parent process’s `lanes` if set. |
| `eventDefinition` | `EventDefinition` | conditional | Single event definition. |
| `eventDefinitions` | `EventDefinition[]` | no | Multiple definitions on one event. |
| `eventDefinitionOptions` | object | no | Compensation and link options. |
| `multiInstance` | `boolean \| object` | no | Loop marker and loop controls. |
| `dataInputs` | `string[]` | no | Ids from root `dataStores` (read). |
| `dataOutputs` | `string[]` | no | Ids from root `dataStores` (write). |
| `dataObjectInputs` | `string[]` | no | Ids from root `dataObjects` (read). |
| `dataObjectOutputs` | `string[]` | no | Ids from root `dataObjects` (write). |
| `color` | `DiColor` | no | DI fill/stroke (bpmn.io bioc + color). |

### `NodeType` → BPMN element

| `type` | BPMN | Typical use |
| ------ | ---- | ----------- |
| `start` | StartEvent | Process entry |
| `end` | EndEvent | Process exit |
| `task` | Task | Generic activity |
| `userTask` | UserTask | Human task |
| `serviceTask` | ServiceTask | Automated/service call |
| `subProcess` | SubProcess / Transaction | Embedded, event, or transaction subprocess |
| `exclusiveGateway` | ExclusiveGateway | XOR decision / merge |
| `parallelGateway` | ParallelGateway | AND split / join |
| `eventBasedGateway` | EventBasedGateway | Wait for first of several catch events |
| `complexGateway` | ComplexGateway | Custom activation/merge logic |
| `intermediateCatch` | IntermediateCatchEvent | Catch event definitions mid-flow |
| `intermediateThrow` | IntermediateThrowEvent | Link throw event |
| `boundaryEvent` | BoundaryEvent | Event attached to an activity |

Unknown `type` values are not allowed (TypeScript + runtime map).

### `eventDefinition`

| Applies to | Values | Meaning |
| ---------- | ------ | ------- |
| event nodes | `timer`, `message`, `signal`, `conditional`, `error`, `escalation`, `terminate`, `cancel`, `compensation`, `link` | Event definition |
| Other types | — | Ignored if present |

**Why:** BPMN distinguishes “none” events from timer/message via event definitions, not via separate JSON types for every variant.

### `multiInstance`

| Value | Result |
| ----- | ------ |
| omitted / `false` | No MI |
| `true` | Parallel multi-instance (`multiInstanceLoopCharacteristics`) |
| `{ sequential: true }` | Sequential MI (`isSequential="true"`) |
| `{ sequential: false }` | Same as parallel |
| `{ loopCardinality: 3 }` | Loop cardinality expression |
| `{ completionCondition: "approved >= 2" }` | Stops MI when the expression is true |
| `{ behavior: "All" \| "One" \| "Complex" }` | BPMN MI completion behavior |

Meaningful on activity-like nodes (`task`, `userTask`, `serviceTask`, `subProcess`). On events/gateways it is unusual; prefer not to set it.

### `dataInputs` / `dataOutputs`

- Each string **must** equal an id in root `dataStores`.
- `dataOutputs` → `dataOutputAssociation` (node writes to store).
- `dataInputs` → `dataInputAssociation` (node reads from store; a placeholder `property` is created for BPMN validity).

**Ownership:** each data store is attached to the **first** process that references it (or the first process if somehow unreferenced). Visually, stores are often placed in the gap between pools.

### `dataObjects`

`dataObjects[]` uses `{ id, name?, isCollection?, color? }`. `dataObjectInputs` and `dataObjectOutputs` create associations to `bpmn:dataObjectReference` elements.

### `eventDefinitionOptions`

- Compensation: `{ activityRef: "UndoCharge", waitForCompletion: false }`.
- Link: `{ linkName: "ReviewHandoff", linkDirection: "source" | "target" }`. A source and target with the same `linkName` are connected.

### Artifacts

- `textAnnotations[]`: `{ id, text, color? }`.
- `groups[]`: `{ id, name?, categoryValue?, color? }`.
- `associations[]`: `{ id, source, target, associationDirection? }`.

### `color` (`DiColor`)

```ts
{ stroke?: string; fill?: string }  // e.g. "#0d4372", "#bbdefb"
```

Emitted on the node’s `bpmndi:BPMNShape` as:

- `bioc:stroke` / `bioc:fill`
- `color:border-color` / `color:background-color`

Namespaces are added on `definitions` only when at least one color exists in the model.

---

## 6. Sequence flow: `IEdge`

Lives **inside** a process (`process.edges` or simple top-level `edges`).

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | `string` | no | Flow id. Default: `Flow_${index+1}`. Prefer stable ids for tests. |
| `source` | `string` | **yes** | Node id in the **same** process. |
| `target` | `string` | **yes** | Node id in the **same** process. |
| `name` | `string` | no | Label on the flow (`Yes`, `No`, `Timeout`, …). |

### Rules

- `source` and `target` must exist among that process’s nodes.
- Self-loops and cycles are allowed (layout routes around obstacles).
- Many edges may share the same source (gateway split) or target (merge).
- This is **not** a message flow: solid sequence line inside one pool.

### Graph expectations (soft)

The converter does not require a single start/end, but for readable BPMN:

- Prefer exactly one `start` (or a clear entry) per process.
- Prefer `end` nodes for terminal paths.
- After `eventBasedGateway`, outgoing targets should typically be `intermediateCatch` events (timer/message) — layout treats that pattern specially (“compass” placement).

---

## 7. Message flow: `IMessageFlow`

Root-level only (`messageFlows[]`).

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | `string` | no | Default: `MessageFlow_${index+1}`. |
| `source` | `string` | **yes** | Node id in some process. |
| `target` | `string` | **yes** | Node id in some process (usually another). |
| `name` | `string` | no | Label (e.g. `Approved`). |

### Rules

- Both ends must exist somewhere in the model’s nodes.
- Intended for **cross-pool** communication (dashed line).
- Connecting two nodes of the **same** process is unusual; prefer `edges` there.
- Typical targets: `intermediateCatch` with `eventDefinition: "message"`, or `start` with message definition.

### Why separate from `edges`?

In BPMN, sequence flow and message flow are different concepts and live in different places (process vs collaboration). Mixing them in one array would break semantics.

---

## 8. Data store: `IDataStore`

Root-level `dataStores[]`.

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | `string` | **yes** | Unique among data stores. Referenced by `dataInputs` / `dataOutputs`. |
| `name` | `string` | no | Label. |
| `color` | `DiColor` | no | Same DI coloring as nodes. |

Emitted as `bpmn:dataStoreReference` (not a full `dataStore` catalog entry). Enough for diagrams and associations.

---

## 9. Id uniqueness matrix

| Scope | Must be unique |
| ----- | -------------- |
| Root `id` | Model-level (your responsibility) |
| `processes[].id` | Among processes |
| All `nodes[].id` | **Global** across every process |
| `lanes[].id` | Within one process |
| `dataStores[].id` | Among data stores |
| `dataObjects[].id` | Among data objects and data stores |
| Artifact ids | Among annotations, groups, nodes, and data references |
| `edges[].id` / `messageFlows[].id` | Should be unique (defaults are index-based) |

**Why global node ids?** Message flows and diagram maps key elements by id across the whole collaboration.

---

## 10. Validation errors (thrown)

| Condition | Error idea |
| --------- | ---------- |
| Missing `id` | `ProcessModel.id is required` |
| No `processes` and no `nodes` | must provide `processes[]` or top-level `nodes[]` |
| Process without nodes | process must contain nodes |
| `edges` not an array | edges must be an array |
| Duplicate node id in a process | duplicate node ids |
| Same node id in two processes | Duplicate node id across processes |
| Duplicate lane / dataStore ids | duplicate ids |
| `laneId` unknown | references unknown laneId |
| `dataInputs`/`dataOutputs` unknown store | unknown data store |
| Edge source/target unknown | unknown source/target |
| Message flow end unknown | MessageFlow has unknown source/target |

---

## 11. Minimal examples

### Simple (no lanes)

```json
{
  "id": "process_1",
  "name": "Simple Process",
  "nodes": [
    { "id": "start", "type": "start" },
    { "id": "task1", "type": "userTask", "name": "Do something" },
    { "id": "end", "type": "end" }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "task1" },
    { "id": "e2", "source": "task1", "target": "end" }
  ]
}
```

### Simple with lanes

```json
{
  "id": "Process_Lanes",
  "name": "Lane Test",
  "lanes": [
    { "id": "Lane_User", "name": "User" },
    { "id": "Lane_System", "name": "System" }
  ],
  "nodes": [
    { "id": "start", "type": "start", "laneId": "Lane_User" },
    { "id": "t1", "type": "userTask", "name": "Fill form", "laneId": "Lane_User" },
    { "id": "t2", "type": "serviceTask", "name": "Validate", "laneId": "Lane_System" },
    { "id": "end", "type": "end", "laneId": "Lane_User" }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "t1" },
    { "id": "e2", "source": "t1", "target": "t2" },
    { "id": "e3", "source": "t2", "target": "end" }
  ]
}
```

### Collaboration sketch

```json
{
  "id": "CollabDemo",
  "name": "Two Pools",
  "dataStores": [{ "id": "DS_1", "name": "Shared DB" }],
  "processes": [
    {
      "id": "Process_A",
      "name": "Pool A",
      "lanes": [{ "id": "L1", "name": "Lane 1" }],
      "nodes": [
        { "id": "a_start", "type": "start", "laneId": "L1" },
        {
          "id": "a_wait",
          "type": "eventBasedGateway",
          "laneId": "L1"
        },
        {
          "id": "a_msg",
          "type": "intermediateCatch",
          "eventDefinition": "message",
          "laneId": "L1"
        },
        { "id": "a_end", "type": "end", "laneId": "L1" }
      ],
      "edges": [
        { "source": "a_start", "target": "a_wait" },
        { "source": "a_wait", "target": "a_msg" },
        { "source": "a_msg", "target": "a_end" }
      ]
    },
    {
      "id": "Process_B",
      "name": "Pool B",
      "nodes": [
        { "id": "b_start", "type": "start", "eventDefinition": "timer" },
        {
          "id": "b_notify",
          "type": "task",
          "name": "Notify",
          "dataOutputs": ["DS_1"]
        },
        { "id": "b_end", "type": "end" }
      ],
      "edges": [
        { "source": "b_start", "target": "b_notify" },
        { "source": "b_notify", "target": "b_end" }
      ]
    }
  ],
  "messageFlows": [
    {
      "id": "mf1",
      "name": "Done",
      "source": "b_notify",
      "target": "a_msg"
    }
  ]
}
```

---

## 12. Full TypeScript shape (conceptual)

```ts
type ProcessModel = {
  id: string;
  name?: string;

  // Simple
  lanes?: { id: string; name: string }[];
  nodes?: INode[];
  edges?: IEdge[];

  // Collaboration
  processes?: IProcessDef[];
  messageFlows?: IMessageFlow[];
  dataStores?: IDataStore[];
  dataObjects?: IDataObject[];
  textAnnotations?: ITextAnnotation[];
  groups?: IGroup[];
  associations?: IAssociation[];
};

type IProcessDef = {
  id: string;
  name?: string;
  participantId?: string;
  participantName?: string;
  lanes?: { id: string; name: string }[];
  nodes: INode[];
  edges: IEdge[];
};

type INode = {
  id: string;
  type:
    | "start" | "end" | "task" | "userTask" | "serviceTask" | "subProcess"
    | "exclusiveGateway" | "parallelGateway" | "inclusiveGateway" | "complexGateway"
    | "eventBasedGateway" | "intermediateCatch" | "intermediateThrow" | "boundaryEvent";
  name?: string;
  laneId?: string;
  eventDefinition?: EventDefinition;
  eventDefinitions?: EventDefinition[];
  eventDefinitionOptions?: { activityRef?: string; waitForCompletion?: boolean; linkName?: string; linkDirection?: "source" | "target" };
  subProcess?: { nodes: INode[]; edges: IEdge[]; expanded?: boolean; subProcessType?: "event" | "transaction" };
  multiInstance?: boolean | { sequential?: boolean; loopCardinality?: string | number; completionCondition?: string; behavior?: "All" | "One" | "Complex" };
  dataInputs?: string[];
  dataOutputs?: string[];
  dataObjectInputs?: string[];
  dataObjectOutputs?: string[];
  color?: { stroke?: string; fill?: string };
};

type IEdge = { id?: string; source: string; target: string; name?: string };
type IMessageFlow = { id?: string; source: string; target: string; name?: string };
type IDataStore = { id: string; name?: string; color?: { stroke?: string; fill?: string } };
type IDataObject = { id: string; name?: string; isCollection?: boolean; color?: { stroke?: string; fill?: string } };
type ITextAnnotation = { id: string; text: string; color?: { stroke?: string; fill?: string } };
type IGroup = { id: string; name?: string; categoryValue?: string; color?: { stroke?: string; fill?: string } };
type IAssociation = { id: string; source: string; target: string; associationDirection?: "None" | "One" | "Both" };
```

Exported from the package as `ProcessModel`, `IProcessDef`, `INode`, `IEdge`, `ILane`, `IMessageFlow`, `IDataStore`, `IDataObject`, `ITextAnnotation`, `IGroup`, `IAssociation`, `DiColor`, `NodeType`, `EventDefinition`.

---

## 13. Suggested reading order for authors

1. Pick **simple** vs **collaboration**.
2. Declare all **ids** (nodes unique globally).
3. Add **lanes** then set every node’s `laneId`.
4. Wire **edges** inside each process (gateway splits/merges, labels).
5. Add **dataStores**, then `dataInputs` / `dataOutputs` on activities.
6. Add **messageFlows** between pools (usually into message catch events).
7. Optionally set **color** on starts/ends/stores for bpmn.io styling.
8. Run `convert(model)` and open XML in [bpmn.io](https://demo.bpmn.io).

Ready-made complex samples: `fixtures/models/accounts-payable.ts`, `incident-response.ts`, `advanced-order.ts`.
