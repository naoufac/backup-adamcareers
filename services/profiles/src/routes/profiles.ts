import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "../lib/require-user.js";
import type { OfferParsed, CvJson, ApplicationFeedback } from "../db/schema.js";

const FREE_EXPORTS_TOTAL = 4;

export default async function profilesRoutes(app: FastifyInstance): Promise<void> {
  // Ensure profile exists on first read.
  async function ensureProfile(userId: string) {
    const rows = await db
      .select({ id: schema.masterProfiles.id })
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, userId))
      .limit(1);
    if (rows[0]) return rows[0].id;
    const inserted = await db
      .insert(schema.masterProfiles)
      .values({ userId })
      .returning({ id: schema.masterProfiles.id });
    return inserted[0].id;
  }

  // GET /api/profiles/me
  app.get("/profiles/me", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.sub))
      .limit(1);
    const profile = rows[0];
    if (!profile) {
      const id = await ensureProfile(me.sub);
      return {
        profile: {
          id,
          userId: me.sub,
          cv: null,
          writingStyle: null,
          preferenceVector: {},
          onboarded: false,
          cvPublic: false,
          analyticsEnabled: false,
          cvViews: 0,
        },
      };
    }
    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        cv: profile.cvJson ?? null,
        writingStyle: profile.writingStyle ?? null,
        preferenceVector: profile.preferenceVector ?? {},
        onboarded: Boolean(profile.onboardedAt),
        cvPublic: profile.cvPublic,
        analyticsEnabled: profile.analyticsEnabled,
        cvViews: profile.cvViews,
      },
    };
  });

  // PUT /api/profiles/me
  app.put("/profiles/me", async (req, reply) => {
    const me = await requireUser(req);
    const bodySchema = z
      .object({
        writingStyle: z.record(z.any()).optional(),
        preferenceVector: z.record(z.number()).optional(),
        cvPublic: z.boolean().optional(),
        analyticsEnabled: z.boolean().optional(),
        onboarded: z.boolean().optional(),
      })
      .passthrough();
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    await ensureProfile(me.sub);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.writingStyle) updates.writingStyle = body.data.writingStyle;
    if (body.data.preferenceVector) updates.preferenceVector = body.data.preferenceVector;
    if (typeof body.data.cvPublic === "boolean") updates.cvPublic = body.data.cvPublic;
    if (typeof body.data.analyticsEnabled === "boolean") updates.analyticsEnabled = body.data.analyticsEnabled;
    if (body.data.onboarded) updates.onboardedAt = new Date();

    await db
      .update(schema.masterProfiles)
      .set(updates)
      .where(eq(schema.masterProfiles.userId, me.sub));
    return { ok: true };
  });

  // GET /api/profiles/me/cv
  app.get("/profiles/me/cv", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select({ cvJson: schema.masterProfiles.cvJson })
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.sub))
      .limit(1);
    return { cv: rows[0]?.cvJson ?? null };
  });

  // PUT /api/profiles/me/cv
  app.put("/profiles/me/cv", async (req, reply) => {
    const me = await requireUser(req);
    const body = z.object({ cv: z.any() }).passthrough().safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    await ensureProfile(me.sub);
    await db
      .update(schema.masterProfiles)
      .set({ cvJson: body.data.cv as CvJson, updatedAt: new Date() })
      .where(eq(schema.masterProfiles.userId, me.sub));
    return { ok: true };
  });

  // GET /api/profiles/me/usage
  app.get("/profiles/me/usage", async (req) => {
    const me = await requireUser(req);
    await ensureProfile(me.sub);
    const rows = await db
      .select({ freeExportsUsed: schema.masterProfiles.freeExportsUsed, paid: schema.masterProfiles.paid })
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.sub))
      .limit(1);
    const profile = rows[0];
    return {
      freeExportsUsed: profile?.freeExportsUsed ?? 0,
      freeExportsTotal: FREE_EXPORTS_TOTAL,
      paid: profile?.paid ?? false,
    };
  });

  // POST /api/profiles/me/increment-export
  app.post("/profiles/me/increment-export", async (req) => {
    const me = await requireUser(req);
    await ensureProfile(me.sub);
    const rows = await db
      .select({ id: schema.masterProfiles.id, freeExportsUsed: schema.masterProfiles.freeExportsUsed, paid: schema.masterProfiles.paid })
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.sub))
      .limit(1);
    const profile = rows[0];
    if (profile && !profile.paid) {
      await db
        .update(schema.masterProfiles)
        .set({ freeExportsUsed: profile.freeExportsUsed + 1, updatedAt: new Date() })
        .where(eq(schema.masterProfiles.id, profile.id));
    }
    return { ok: true };
  });

  // Experiences
  app.get("/profiles/experiences", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select()
      .from(schema.experiences)
      .where(eq(schema.experiences.userId, me.sub))
      .orderBy(desc(schema.experiences.createdAt));
    return { experiences: rows };
  });

  app.post("/profiles/experiences", async (req, reply) => {
    const me = await requireUser(req);
    const body = z.object({
      company: z.string().optional(),
      title: z.string().min(1),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      location: z.string().optional(),
      industry: z.string().optional(),
      companySize: z.string().optional(),
      notes: z.string().optional(),
      bullets: z.array(z.string()).default([]),
      variants: z.array(z.record(z.any())).default([]),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const [exp] = await db
      .insert(schema.experiences)
      .values({
        userId: me.sub,
        title: body.data.title,
        company: body.data.company ?? null,
        startDate: body.data.startDate ?? null,
        endDate: body.data.endDate ?? null,
        location: body.data.location ?? null,
        industry: body.data.industry ?? null,
        companySize: body.data.companySize ?? null,
        notes: body.data.notes ?? null,
        bullets: body.data.bullets,
        variants: body.data.variants as any,
      })
      .returning();
    return { experience: exp };
  });

  app.put("/profiles/experiences/:id", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const body = z.object({
      company: z.string().optional(),
      title: z.string().min(1).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      location: z.string().optional(),
      industry: z.string().optional(),
      companySize: z.string().optional(),
      notes: z.string().optional(),
      bullets: z.array(z.string()).optional(),
      variants: z.array(z.record(z.any())).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const rows = await db
      .select({ userId: schema.experiences.userId })
      .from(schema.experiences)
      .where(eq(schema.experiences.id, id))
      .limit(1);
    if (!rows[0] || rows[0].userId !== me.sub) return reply.code(404).send({ error: "Not found" });
    const updates: Record<string, unknown> = {};
    if (body.data.title !== undefined) updates.title = body.data.title;
    if (body.data.company !== undefined) updates.company = body.data.company ?? null;
    if (body.data.startDate !== undefined) updates.startDate = body.data.startDate ?? null;
    if (body.data.endDate !== undefined) updates.endDate = body.data.endDate ?? null;
    if (body.data.location !== undefined) updates.location = body.data.location ?? null;
    if (body.data.industry !== undefined) updates.industry = body.data.industry ?? null;
    if (body.data.companySize !== undefined) updates.companySize = body.data.companySize ?? null;
    if (body.data.notes !== undefined) updates.notes = body.data.notes ?? null;
    if (body.data.bullets !== undefined) updates.bullets = body.data.bullets;
    if (body.data.variants !== undefined) updates.variants = body.data.variants as any;
    updates.updatedAt = new Date();
    const [exp] = await db
      .update(schema.experiences)
      .set(updates)
      .where(eq(schema.experiences.id, id))
      .returning();
    return { experience: exp };
  });

  app.delete("/profiles/experiences/:id", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const rows = await db
      .select({ userId: schema.experiences.userId })
      .from(schema.experiences)
      .where(eq(schema.experiences.id, id))
      .limit(1);
    if (!rows[0] || rows[0].userId !== me.sub) return reply.code(404).send({ error: "Not found" });
    await db.delete(schema.experiences).where(eq(schema.experiences.id, id));
    return { ok: true };
  });

  // Offers
  app.get("/profiles/offers", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select({
        id: schema.offers.id,
        parsedJson: schema.offers.parsedJson,
        atsScore: schema.offers.atsScore,
        createdAt: schema.offers.createdAt,
      })
      .from(schema.offers)
      .where(eq(schema.offers.userId, me.sub))
      .orderBy(desc(schema.offers.createdAt));
    return { offers: rows };
  });

  app.post("/profiles/offers", async (req, reply) => {
    const me = await requireUser(req);
    const body = z.object({
      raw: z.string().min(50).max(20000),
      parsed: z.record(z.any()),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const [offer] = await db
      .insert(schema.offers)
      .values({
        userId: me.sub,
        raw: body.data.raw,
        parsedJson: body.data.parsed as OfferParsed,
      })
      .returning();
    return { offer };
  });

  app.get("/profiles/offers/:id", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const rows = await db
      .select()
      .from(schema.offers)
      .where(eq(schema.offers.id, id))
      .limit(1);
    const offer = rows[0];
    if (!offer || offer.userId !== me.sub) return reply.code(404).send({ error: "Not found" });
    return { offer };
  });

  // Applications
  app.get("/profiles/applications", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select({
        id: schema.applications.id,
        offerId: schema.applications.offerId,
        status: schema.applications.status,
        createdAt: schema.applications.createdAt,
        offerParsed: schema.offers.parsedJson,
      })
      .from(schema.applications)
      .innerJoin(schema.offers, eq(schema.applications.offerId, schema.offers.id))
      .where(eq(schema.applications.userId, me.sub))
      .orderBy(desc(schema.applications.createdAt));
    return { applications: rows };
  });

  app.post("/profiles/applications", async (req, reply) => {
    const me = await requireUser(req);
    const body = z.object({
      offerId: z.string().uuid(),
      cvVariantJson: z.record(z.any()).optional(),
      coverLetter: z.string().optional(),
      status: z.enum(["draft", "finalized"]).default("draft"),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const [application] = await db
      .insert(schema.applications)
      .values({
        userId: me.sub,
        offerId: body.data.offerId,
        cvVariantJson: (body.data.cvVariantJson ?? {}) as CvJson,
        coverLetter: body.data.coverLetter,
        status: body.data.status,
      })
      .returning();
    return { application };
  });

  app.get("/profiles/applications/:id", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const rows = await db
      .select({
        id: schema.applications.id,
        userId: schema.applications.userId,
        status: schema.applications.status,
        coverLetter: schema.applications.coverLetter,
        cvVariantJson: schema.applications.cvVariantJson,
        offer: { id: schema.offers.id, parsedJson: schema.offers.parsedJson },
      })
      .from(schema.applications)
      .innerJoin(schema.offers, eq(schema.applications.offerId, schema.offers.id))
      .where(eq(schema.applications.id, id))
      .limit(1);
    const application = rows[0];
    if (!application || application.userId !== me.sub) return reply.code(404).send({ error: "Not found" });
    return { application };
  });

  app.put("/profiles/applications/:id", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const body = z.object({
      cvVariantJson: z.record(z.any()).optional(),
      coverLetter: z.string().optional(),
      status: z.enum(["draft", "finalized"]).optional(),
      feedback: z.array(z.record(z.any())).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const rows = await db
      .select({ userId: schema.applications.userId })
      .from(schema.applications)
      .where(eq(schema.applications.id, id))
      .limit(1);
    if (!rows[0] || rows[0].userId !== me.sub) return reply.code(404).send({ error: "Not found" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.cvVariantJson) updates.cvVariantJson = body.data.cvVariantJson as CvJson;
    if (body.data.coverLetter !== undefined) updates.coverLetter = body.data.coverLetter;
    if (body.data.status) updates.status = body.data.status;
    if (body.data.feedback) updates.feedback = body.data.feedback as ApplicationFeedback[];

    const [application] = await db
      .update(schema.applications)
      .set(updates)
      .where(eq(schema.applications.id, id))
      .returning();
    return { application };
  });
}
