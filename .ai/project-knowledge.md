# Project knowledge

## Purpose
JSON → BPMN 2.0 XML converter (`convert(model)`), based on `bpmn-moddle` + ELK layout + `xml-formatter`.

## Repo layout
```
src/                 # library (published as dist/)
  builders/
  converter/
  constants/
  types/
  utils/edge-router.ts
  elk.layout.ts
  index.ts
fixtures/models/     # ProcessModel fixtures (English), for local-run + tests
scripts/local-run.ts # pick a fixture → print XML
examples/            # runnable demos
tests/               # vitest
assets/
```

## Public API
- `convert(model: ProcessModel): Promise<string>`
- `BpmnConverter`
- Types: `ProcessModel`, `INode`, `IEdge`, `ILane`, `NodeType`

## Fixtures
- `lanesSingleNode`, `lanesSimpleFlow`, `orderCrossLane`, `advancedOrder`
- Switch import in `scripts/local-run.ts`

## XML / layout rules
See README. Key: `laneId` input-only; lanes inset for headers; orthogonal edge router in `src/utils/edge-router.ts`.

## Scripts
- `npm test` / `npm run local` / `npm run example:*` / `npm run build`
