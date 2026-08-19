import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(here, "../../../.env"),
  path.resolve(here, "../.env"),
];

for (const p of candidates) {
  const { error } = config({ path: p });
  if (!error) break;
}
