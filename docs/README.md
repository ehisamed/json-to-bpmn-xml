# Documentation

Index of project docs and local tooling.

| Doc | Language | Contents |
| --- | -------- | -------- |
| [json-schema.en.md](./json-schema.en.md) | English | `ProcessModel` JSON: fields, nesting, rules, validation, examples |
| [json-schema.ru.md](./json-schema.ru.md) | Русский | То же: структура JSON, правила, связи, типы, примеры |
| [accounts-payable.md](./accounts-payable.md) | English | Complete collaboration example: JSON input, generated BPMN XML, diagram, reproduction and test evidence |
| [bpmn-import.md](./bpmn-import.md) | English | Safe BPMN XML import, partial JSON, warnings, and original XML preservation |

Package overview, API, and quick start: [../README.md](../README.md).

---

## Fixture previews (PNG)

Convert every model in `fixtures/models/` to BPMN XML and a PNG, then import **every generated XML** back to JSON. Also import every BPMN/XML file in `fixtures/xml/`. The reverse preview keeps simple pairs: unchanged source `.bpmn` and imported `.json` with warnings. `coverage.md` at the preview root aggregates those warnings. PNGs remain in the forward `json-to-bpmn/` folder. PNG framing adds white padding only; diagram layout is unchanged by the framing step.

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
  coverage.md                        # missing reverse-import coverage
  coverage.json                      # machine-readable report
  json-to-bpmn/
    accountsPayable.bpmn
    accountsPayable.png
    …
  bpmn-to-json/
    accountsPayable.bpmn             # unchanged generated XML
    accountsPayable.json             # { model, warnings }
    …
    unsupported-ad-hoc.bpmn          # unchanged hand-written XML fixture
    unsupported-ad-hoc.json
```

- Folder name = date + time of the run
- `previews/` is gitignored
- An XML fixture without an importable model still gets its original `.bpmn` and a `.json` with `model: null` and warnings.
- If a hand-written XML fixture has the same basename as a model fixture, its output name is prefixed with `xml-` to prevent overwriting.
- `coverage.md` groups unsupported BPMN elements separately from dependent dropped flows and informational DI-layout warnings. It is based on actual `importBpmn` warnings, not an exhaustive semantic diff.
- Terminal shows colored step tree and a progress bar
- PNG: white margin around the diagram; **no** fake black border (only BPMN pool/lane borders if present)

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
| `gatewayFanoutJogs` | `gateway-fanout-jogs.ts` | Exclusive fan-out without detached stubs |
| `sharedEndDualIncoming` | `shared-end-dual-incoming.ts` | Two paths → one End (shared axis) |
| `gatewayLongLabel` | `gateway-long-label.ts` | Long gateway label placement |
| `gatewayMultiToSameEnd` | `gateway-multi-to-same-end.ts` | Rejected/Timeout → shared End |
| `gatewayYesNoCross` | `gateway-yes-no-cross.ts` | Yes right / No bottom on diamond |
| `gatewayJoinBypassTop` | `gateway-join-bypass-top.ts` | Bypass over top into join |

Layout / routing notes live in [../README.md](../README.md#layout-notes). Routing regressions: `tests/routing-cases.test.ts`.

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
