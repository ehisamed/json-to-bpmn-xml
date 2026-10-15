# Safe BPMN XML import

`importBpmn(xml)` is an asynchronous reverse converter. It returns `{ model, warnings, sourceXml }`. The returned `model` is a supported projection of the BPMN document, not a lossless representation. `sourceXml` is exactly the input string and is never rewritten.

## Example: known elements

Given `Start → Check invoice → End`, the importer returns JSON nodes and sequence-flow edges with their IDs and names. `await convert(model)` produces a new valid BPMN diagram. The generated XML may have different formatting, definitions metadata, and BPMNDI coordinates.

```ts
import { readFile } from "node:fs/promises";
import { importBpmn, convert } from "json-to-bpmn-xml";

const input = await readFile("./invoice.bpmn", "utf8");
const result = await importBpmn(input);
if (result.model === null) throw new Error(result.warnings.map(w => w.message).join("\n"));
const newDiagram = await convert(result.model);
// Preserve result.sourceXml separately if you need the exact original.
```

## Example: unsupported element

[`fixtures/xml/unsupported-ad-hoc.bpmn`](../fixtures/xml/unsupported-ad-hoc.bpmn) has `Start → AdHocSubProcess → End` and a direct `Start → End` path. `AdHocSubProcess` is not in `ProcessModel`. The importer keeps `Start`, `End`, and their direct flow. It omits the ad-hoc subprocess, its attached boundary event, and three dependent flows. Warnings include their BPMN IDs. The original XML is still available as `sourceXml`.

```ts
const { model, warnings, sourceXml } = await importBpmn(input);
// model.nodes: Start, End
// model.edges: Flow_Direct
// warnings: unsupported AdHoc, missing-reference Boundary,
//           dropped-flow Flow_To_AdHoc / Flow_From_AdHoc / Flow_From_Boundary
```

## What is imported

Supported process nodes, sequence flows, basic event definitions and references, task properties, multi-instance loop settings, lanes, nested subprocesses, collaboration participants and message flows, and reusable message/signal/error/escalation definitions. Import is deliberately conservative: constructs outside this mapping are omitted and usually reported as `unsupported`. Data objects/stores, data associations, text annotations, groups, and arbitrary extension elements are currently source-only. BPMNDI coordinates are not imported; `convert` recalculates layout.

Warnings have a `code`, human-readable `message`, and optional `elementId`. `diagram-rebuilt` means existing BPMNDI geometry will not be reused. `dropped-flow` means an endpoint was unsupported or missing. `conversion-failed` means the partial JSON violates the forward converter's constraints, so `model` is returned as `null`. Parser warnings are surfaced with `parse`. Warnings are advisory, not an exhaustive diff of every XML attribute; keep `sourceXml` for lossless storage.

Do not replace a user's original XML with `await convert(model)` unless they explicitly accept dropped BPMN content and a new diagram layout. Importing does not mutate the source string or any file.

Run `npm run preview` to inspect both directions. The timestamped output contains separate `json-to-bpmn/` and `bpmn-to-json/` directories. The latter imports all generated model XML under `from-models/` and hand-written XML fixtures under `from-xml/`. Each case has its original source, imported JSON and warnings, plus regenerated XML/PNG when a supported model exists. `bpmn-to-json/coverage.md` lists the actual missing import coverage and related flow losses; `coverage.json` contains the machine-readable report.
