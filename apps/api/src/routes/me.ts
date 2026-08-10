import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";
import { readRequestSession } from "../lib/session.js";
import { requireUser, Unauthorized } from "./auth.js";

const FREE_EXPORTS_TOTAL = 4;

export default async function meRoutes(app: FastifyInstance): Promise<void> {
  // Public config: what payment provider is enabled
  app.get("/me/config", async () => {
    return {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
      exportPrice: process.env.EXPORT_PRICE_CENTS ?? 100, // $1.00 default
      currency: process.env.PAYMENT_CURRENCY ?? "usd",
    };
  });

  app.get("/me", async (req) => {
    const claims = await readRequestSession(req);
    if (!claims) throw new Unauthorized();
    const rows = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        locale: schema.users.locale,
      })
      .from(schema.users)
      .where(eq(schema.users.id, claims.sub))
      .limit(1);
    const u = rows[0];
    if (!u) throw new Unauthorized();
    return { user: u };
  });

  app.get("/me/profile", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.id))
      .limit(1);
    const profile = rows[0];
    return {
      onboarded: Boolean(profile?.onboardedAt),
      cv: profile?.cvJson ?? null,
      writingStyle: profile?.writingStyle ?? null,
    };
  });

  // GET /api/me/usage -> free-tier status
  app.get("/me/usage", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select({
        freeExportsUsed: schema.masterProfiles.freeExportsUsed,
        paid: schema.masterProfiles.paid,
      })
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.id))
      .limit(1);
    const profile = rows[0];
    return {
      freeExportsUsed: profile?.freeExportsUsed ?? 0,
      freeExportsTotal: FREE_EXPORTS_TOTAL,
      paid: profile?.paid ?? false,
    };
  });

  // POST /api/billing/pay-export -> stub payment, set paid=true
  app.post("/billing/pay-export", async (req, reply) => {
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
    if (!profile) return reply.code(404).send({ error: "Profile not found" });

    // Already paid? nothing to do
    if (profile.paid) return { ok: true, alreadyPaid: true };

    // If still in free tier, just increment usage
    if (profile.freeExportsUsed < FREE_EXPORTS_TOTAL) {
      await db
        .update(schema.masterProfiles)
        .set({ freeExportsUsed: profile.freeExportsUsed + 1 })
        .where(eq(schema.masterProfiles.id, profile.id));
      return { ok: true, freeExport: true, remaining: FREE_EXPORTS_TOTAL - profile.freeExportsUsed - 1 };
    }

    // Payment stub: mark as paid
    await db
      .update(schema.masterProfiles)
      .set({ paid: true })
      .where(eq(schema.masterProfiles.id, profile.id));

    return { ok: true, paid: true, message: "Payment received (stub). Unlimited exports unlocked." };
  });

  // POST /api/me/profile -> update user profile (name, locale, password)
  app.post("/me/profile", async (req, reply) => {
    const me = await requireUser(req);
    const bodySchema = z
      .object({
        name: z.string().min(1).optional(),
        locale: z.enum(["fr", "en"]).optional(),
        password: z.string().min(8).optional(),
      })
      .passthrough();

    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const updates: { name?: string; locale?: "fr" | "en"; passwordHash?: string } = {};
    if (body.data.name) updates.name = body.data.name;
    if (body.data.locale) updates.locale = body.data.locale;
    if (body.data.password) {
      const { hashPassword } = await import("../lib/auth.js");
      updates.passwordHash = await hashPassword(body.data.password);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(schema.users).set({ ...updates, updatedAt: new Date() }).where(eq(schema.users.id, me.id));
    }

    return { ok: true };
  });

  // PUT /api/cv/mine -> update the saved master CV JSON
  app.put("/cv/mine", async (req, reply) => {
    const me = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.id))
      .limit(1);
    const profile = rows[0];
    if (!profile) return reply.code(404).send({ error: "Profile not found" });

    const bodySchema = z.object({ cv: z.any() }).passthrough();
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    await db
      .update(schema.masterProfiles)
      .set({ cvJson: body.data.cv, updatedAt: new Date() })
      .where(eq(schema.masterProfiles.id, profile.id));

    return { ok: true };
  });
}
