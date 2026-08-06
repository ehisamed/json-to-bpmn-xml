/**
 * Local development runner.
 *
 * Usage:
 *   npm run local
 *
 * Switch the imported model to try another fixture from `fixtures/models`.
 */
import { convert } from "../src/index";
import { advancedOrder } from "../fixtures/models";

const xml = await convert(advancedOrder);
console.log(xml);
