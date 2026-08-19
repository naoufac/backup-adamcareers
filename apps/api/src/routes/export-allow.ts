import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth.js";

const FREE_EXPORTS_TOTAL = 4;

export async function registerExportAllowRoutes(app: FastifyInstance): Promise<void> {
  app.post("/export/allow", async (req: FastifyRequest, reply: FastifyReply) => {
    const me = await requireUser(req);

    const rows = await db
      .select({
        id: schema.masterProfiles.id,
        freeExportsUsed: schema.masterProfiles.freeExportsUsed,
        paid: schema.masterProfiles.paid,
      })
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.id))
      .limit(1);

    const profile = rows[0];
    if (!profile) {
      return reply.code(404).send({ allowed: false, paid: false, error: "Profile not found" });
    }

    if (profile.paid || profile.freeExportsUsed < FREE_EXPORTS_TOTAL) {
      if (!profile.paid) {
        await db
          .update(schema.masterProfiles)
          .set({ freeExportsUsed: profile.freeExportsUsed + 1 })
          .where(eq(schema.masterProfiles.id, profile.id));
      }
      return reply.send({ allowed: true, paid: profile.paid });
    }

    return reply.code(402).send({ allowed: false, paid: false, error: "Payment required" });
  });
}
