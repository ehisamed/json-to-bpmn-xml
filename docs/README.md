# Documentation

Index of project docs and local tooling.

| Doc | Language | Contents |
| --- | -------- | -------- |
| [json-schema.en.md](./json-schema.en.md) | English | `ProcessModel` JSON: fields, nesting, rules, validation, examples |
| [json-schema.ru.md](./json-schema.ru.md) | Русский | То же: структура JSON, правила, связи, типы, примеры |

Package overview, API, and quick start: [../README.md](../README.md).

---

## Fixture previews (PNG)

Convert every model in `fixtures/models/` to BPMN XML and a framed PNG (white background, padding, thin black border). Diagram conversion/layout is unchanged — framing is applied only to the image.

### Setup (once)

Needs Chrome for Puppeteer (`bpmn-to-image`):

```bash
npm run preview:setup
```

If Chrome is already in `~/.cache/puppeteer`, skip this. The preview script also tries to install it automatically when missing.

### Run

```bash
npm run preview
```

### Output

```
previews/YYYY-MM-DD_HH-mm-ss/
  accountsPayable.bpmn
  accountsPayable.png
  advancedOrder.bpmn
  advancedOrder.png
  …
```

- Folder name = date + time of the run
- `previews/` is gitignored
- Terminal shows colored step tree and a progress bar

### Related scripts

| Command | Purpose |
| ------- | ------- |
| `npm run preview` | All fixtures → `.bpmn` + `.png` |
| `npm run preview:setup` | Install Puppeteer Chrome |
| `npm run local` | Print XML for one fixture (`scripts/local-run.ts`) |
| `npm run example:accounts` | Accounts Payable example |

Source: [`scripts/render-fixtures.ts`](../scripts/render-fixtures.ts).

---

## Fixtures

Reusable `ProcessModel` samples under [`fixtures/models/`](../fixtures/models/):

| Export | File | Notes |
| ------ | ---- | ----- |
| `lanesSingleNode` | `lanes-single-node.ts` | Three lanes, one start |
| `lanesSimpleFlow` | `lanes-simple-flow.ts` | Start → task → end |
| `orderCrossLane` | `order-cross-lane.ts` | Cross-lane + gateway |
| `advancedOrder` | `advanced-order.ts` | Single pool, retry loop |
| `accountsPayable` | `accounts-payable.ts` | Collaboration: 2 pools, event GW, messages, data store |
| `incidentResponse` | `incident-response.ts` | Collaboration: Support Desk + Operations |
| `processPayable` | `process-payable.ts` | Single-pool payable slice |
| `schedulePayments` | `schedule-payments.ts` | Schedule-payments slice |
| `exclusiveFanoutUpForward` | `exclusive-fanout-up-forward.ts` | Exclusive GW: up-lane + forward |
| `crossLaneSparseDrop` | `cross-lane-sparse-drop.ts` | Sparse Service lane (Deliver vs Charge) |
| `parallelSplitJoin` | `parallel-split-join.ts` | Parallel split/join |
| `exclusiveThreeWay` | `exclusive-three-way.ts` | Three-way exclusive + labels |
| `timerStartSimple` | `timer-start-simple.ts` | Timer start event |
| `messageStartSimple` | `message-start-simple.ts` | Message start event |
| `subprocessAndMultiInstance` | `subprocess-and-multi-instance.ts` | Collapsed subProcess + MI |

Import from the barrel:

```typescript
import { accountsPayable, advancedOrder } from "../fixtures/models";
```

---

## JSON schema docs

Full input contract for `convert()`:

- **EN** — [json-schema.en.md](./json-schema.en.md)
- **RU** — [json-schema.ru.md](./json-schema.ru.md)

Covers simple vs collaboration mode, node types, edges, message flows, data stores, DI colors, and validation rules.
