# Project knowledge

## Purpose
JSON → BPMN 2.0 XML (`convert`), bpmn-moddle + ELK + orthogonal router.

## Layout
```
src/                 library → dist/
fixtures/models/     ProcessModel fixtures (accountsPayable is the full sample)
scripts/local-run.ts import a fixture → print XML
examples/ tests/
```

## ProcessModel
- Simple: top-level `nodes` / `edges` / `lanes`
- Collaboration: `processes[]` + `messageFlows` + `dataStores`
- Node extras: `eventDefinition`, `multiInstance`, `dataInputs` / `dataOutputs`
- Types: start/end/task/userTask/serviceTask/subProcess/exclusive|parallel|eventBased gateway/intermediateCatch

## Full sample
`fixtures/models/accounts-payable.ts` mirrors diagram (9).bpmn (two pools).
`npm run local` uses it.
