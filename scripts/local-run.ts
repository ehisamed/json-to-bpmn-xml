/**
 * Local development runner.
 *
 * Usage:
 *   npm run local
 *
 * Swap the imported model to try another fixture from `fixtures/models`.
 */
import { convert } from "../src/index";
import { accountsPayable } from "../fixtures/models/accounts-payable";

const xml = await convert(accountsPayable);
console.log(xml);
