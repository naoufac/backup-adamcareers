import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const url =
  process.env.DATABASE_URL ?? "postgres://adam:change_me@localhost:5433/adamjobs";

export const queryClient = postgres(url, { max: 10 });
export const db = drizzle(queryClient, { schema });
export { schema };
