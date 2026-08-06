import { convert } from "../src/index";
import { processPayable } from "../fixtures/models/process-payable";

/**
 * Approximated "Process Payable" pool from diagram (9).bpmn.
 * See fixture comments for unsupported BPMN features.
 */
const xml = await convert(processPayable);
console.log(xml);
