import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";
import { requireUser } from "../lib/require-user.js";
import {
  getUsage,
  incrementExportUsage,
  usageFromRow,
  type UsageResult,
} from "../lib/profiles-client.js";

const FREE_EXPORTS_TOTAL = 4;

export async function registerExportAllowRoutes(app: FastifyInstance): Promise<void> {
  app.post("/export/allow", async (req: FastifyRequest, reply: FastifyReply) => {
    const me = await requireUser(req);
    const token =
      req.cookies?.[process.env.AUTH_COOKIE_NAME ?? "adam_session"] ?? getBearerToken(req);

    // Prefer profiles service for usage data.
    let usage: UsageResult | null = null;
    if (token) {
      usage = await getUsage(me.sub, token);
    }

    // Fallback to local usage cache if profiles service unavailable.
    if (!usage) {
      const rows = await db
        .select()
        .from(schema.usage)
        .where(eq(schema.usage.userId, me.sub))
        .limit(1);
      const u = rows[0];
      if (!u) {
        // Auto-create usage record on first export attempt.
        const inserted = await db
          .insert(schema.usage)
          .values({ userId: me.sub, freeExportsUsed: 0, paid: false })
          .returning();
        usage = usageFromRow(inserted[0]);
      } else {
        usage = usageFromRow(u);
      }
    }

    if (!usage) {
      return reply.code(404).send({ allowed: false, paid: false, error: "Profile not found" });
    }

    if (usage.paid || usage.freeExportsUsed < FREE_EXPORTS_TOTAL) {
      if (!usage.paid) {
        if (token) {
          const updated = await incrementExportUsage(me.sub, token);
          if (updated) usage = updated;
        }
        // If profiles update failed, increment local fallback.
        if (usage.freeExportsUsed < FREE_EXPORTS_TOTAL) {
          const rows = await db
            .select()
            .from(schema.usage)
            .where(eq(schema.usage.userId, me.sub))
            .limit(1);
          const u = rows[0];
          if (u && !u.paid) {
            await db
              .update(schema.usage)
              .set({ freeExportsUsed: u.freeExportsUsed + 1 })
              .where(eq(schema.usage.id, u.id));
          }
        }
      }
      return reply.send({ allowed: true, paid: usage.paid });
    }

    return reply.code(402).send({ allowed: false, paid: false, error: "Payment required" });
  });
}

function getBearerToken(req: FastifyRequest): string | undefined {
  const auth = req.headers.authorization;
  if (!auth) return undefined;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) return token;
  return undefined;
}
