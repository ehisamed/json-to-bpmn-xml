import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { accountsPayable } from "../fixtures/models/accounts-payable";
import { convert } from "../src/index";

// Keep the published example derived from the tested fixture.
const directory = new URL("../docs/examples/", import.meta.url);
const xml = await convert(accountsPayable);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL("accounts-payable.json", directory),
  JSON.stringify(accountsPayable, null, 2) + "\n",
);
await writeFile(new URL("accounts-payable.bpmn", directory), xml);
console.log(`Exported Accounts Payable JSON and BPMN to ${fileURLToPath(directory)}`);
