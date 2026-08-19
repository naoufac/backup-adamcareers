import type { FastifyInstance } from "fastify";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth.js";
import { Unauthorized } from "../lib/tokens.js";

export default async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, locale: schema.users.locale })
      .from(schema.users)
      .where(eq(schema.users.id, me.id))
      .limit(1);
    const u = rows[0];
    if (!u) throw new Unauthorized();
    return { user: u };
  });
}
