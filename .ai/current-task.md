# Current task

## Status
Layout aligned with reference `diagram (10).bpmn`:
- Event-based gateway compass: Timer↑, Approved↓, Rejected→, Failure end above Rejected
- Shared end for No / Timeout / Failure (no separate Event_No)
- Cross-lane vertical drop; Schedule Payments bypass above spine
- Message flows avoid data store

## Verify
```bash
npm test && npm run local
```
Compare with `~/Downloads/diagram (10).bpmn` in bpmn.io.
