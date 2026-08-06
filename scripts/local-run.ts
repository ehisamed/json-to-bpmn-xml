/**
 * Local development runner.
 *
 * Usage:
 *   npm run local
 *
 * Swap the imported model to try another fixture from `fixtures/models`.
 */
import { convert } from "../src/index";
// !DON'T REMOVE
// import { accountsPayable } from "../fixtures/models/accounts-payable";
// import { advancedOrder } from "../fixtures/models/advanced-order";
import { incidentResponse } from "../fixtures/models/incident-response";
import { lanesSimpleFlow } from "../fixtures/models/lanes-simple-flow";
import { lanesSingleNode } from "../fixtures/models/lanes-single-node";
import { orderCrossLane } from "../fixtures/models/order-cross-lane";

const xml = await convert(orderCrossLane);
console.log(xml);
