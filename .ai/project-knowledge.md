# Project knowledge

## Purpose
JSON → BPMN 2.0 XML converter (`convert(model)`), based on `bpmn-moddle` + ELK layout + `xml-formatter`.

## Public API
- `convert(model: ProcessModel): Promise<string>`
- `BpmnConverter`
- Types: `ProcessModel`, `INode`, `IEdge`, `ILane`, `NodeType`

## ProcessModel
```ts
{
  id: string;
  name?: string;
  lanes?: { id: string; name: string }[];
  nodes: { id; type; name?; laneId? }[];
  edges: { id?; source; target; name? }[];
}
```

Node types: `start | end | userTask | serviceTask | exclusiveGateway | parallelGateway`

## XML rules (important)
- `laneId` is **input-only** — never written into BPMN XML.
- Without lanes: plane → process, no collaboration.
- With lanes: collaboration + participant + laneSet + lane DI shapes.
- Definitions always include `xsi:schemaLocation` and OMG `targetNamespace`.
- Waypoints are deduplicated (no consecutive identical points).

## Layout
- ELK layered, RIGHT, ORTHOGONAL (X positions).
- Without lanes: raw ELK coordinates; edges via orthogonal router.
- With lanes:
  - Participant at `POOL_OFFSET`; **lanes inset by `POOL_HEADER_WIDTH` (30)** so pool title and lane titles do not overlap.
  - Nodes vertically centered in equal-height lanes.
  - Edges: `src/utils/edge-router.ts`
    - forward cross-lane → side docks (Z in gap)
    - upward branch → top exit
    - backward loop with node below → left exit + left channel (avoid cutting through stacked lane nodes)
    - obstacle bypass if a segment still hits a node
    - dock spreading + straight snap for near-horizontal links

## Scripts
- `npm test` — vitest
- `npm run local` — advanced order process with lanes
- `npm run example:lanes` / `example:simple`

## Branch note
Work on `lane` branch: lanes + collaboration were added on top of main.
