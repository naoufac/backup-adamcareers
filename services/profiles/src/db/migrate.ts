import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "postgres://adam:adam@localhost:5433/adamjobs";
const client = postgres(url, { max: 1 });
const db = drizzle(client);

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "../../drizzle");

await migrate(db, { migrationsFolder });
await client.end();
