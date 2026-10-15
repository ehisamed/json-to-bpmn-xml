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

Supported process nodes, sequence flows, basic event definitions and references, task properties, multi-instance loop settings, lanes, nested subprocesses (including empty ordinary subprocesses), collaboration participants and message flows, reusable message/signal/error/escalation definitions, top-level data-store/data-object references and simple activity input/output associations, text annotations, groups, and artifact associations. For example, `dataObjectInputs: ["InvoiceDocument"]` is restored from a single-source `DataInputAssociation`; `dataOutputs: ["InvoiceStore"]` is restored from a `DataOutputAssociation` targeting a data-store reference. See [`data-objects.ts`](../fixtures/models/data-objects.ts) and [`artifacts.ts`](../fixtures/models/artifacts.ts) for full generated examples.

Import is deliberately conservative: constructs outside this mapping are omitted or projected with warnings. A BPMN `Group` becomes `{ id }` because the generated XML currently does not carry the JSON `name` or `categoryValue`. Data association assignments, transformations, non-placeholder input targets, nested data references, group category references, arbitrary extension elements and vendor attributes remain only in `sourceXml`. BPMNDI coordinates and colors are not imported; `convert` recalculates layout. Re-export is therefore not a lossless round trip even when no structural warning appears.

Warnings have a `code`, human-readable `message`, and optional `elementId`. `diagram-rebuilt` means existing BPMNDI geometry will not be reused. `dropped-flow` means an endpoint was unsupported or missing. `conversion-failed` means the partial JSON violates the forward converter's constraints, so `model` is returned as `null`. Parser warnings are surfaced with `parse`. Warnings are advisory, not an exhaustive diff of every XML attribute; keep `sourceXml` for lossless storage.

Do not replace a user's original XML with `await convert(model)` unless they explicitly accept dropped BPMN content and a new diagram layout. Importing does not mutate the source string or any file.

Run `npm run preview` to inspect both directions. The timestamped output contains separate `json-to-bpmn/` and `bpmn-to-json/` directories. The reverse folder contains one `.bpmn`/`.json` pair per generated model XML or hand-written XML fixture. The `.bpmn` is always the unchanged source; `.json` holds `{ model, warnings }`. The root-level `coverage.md` lists observed gaps and related flow losses; `coverage.json` is the machine-readable version. Forward PNGs remain in `json-to-bpmn/`.
