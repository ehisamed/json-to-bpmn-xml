import { convert } from "../src/index";
import { schedulePayments } from "../fixtures/models/schedule-payments";

/**
 * Approximated "Schedule Payments" pool from diagram (9).bpmn.
 * See fixture comments for unsupported BPMN features.
 */
const xml = await convert(schedulePayments);
console.log(xml);
