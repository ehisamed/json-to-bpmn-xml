import { convert } from "../src/index";
import { accountsPayable } from "../fixtures/models";

/**
 * Full accounts-payable collaboration (two pools) from diagram (9).bpmn.
 */
const xml = await convert(accountsPayable);
console.log(xml);
