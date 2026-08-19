import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "./auth.js";
import { chatJson } from "../lib/llm.js";
import { normalizeCv, validateCanadianCv } from "@adamjobs/cv-engine";
import { diffCv, applyChanges, type CvChange } from "../lib/diff-cv.js";
import type { OfferParsed, CompanyResearch } from "../db/schema.js";

const offerSchema = z.object({
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  workMode: z.string().nullable().optional(),
  mustHaveSkills: z.array(z.string()).nullish(),
  niceToHaveSkills: z.array(z.string()).nullish(),
  responsibilities: z.array(z.string()).nullish(),
  language: z.enum(["fr", "en"]).optional(),
  salary: z.string().nullable().optional(),
}).passthrough();

const parseOfferSystem = `You are Adam, an expert at reading Canadian job offers. Parse the offer text and return ONLY JSON: {"title","company","location","workMode","mustHaveSkills":[string],"niceToHaveSkills":[string],"responsibilities":[string],"language":"fr"|"en","salary"}. Extract the real required skills, not generic fluff. Detect the dominant language of the offer. null for unknown fields.`;

const researchSystem = `You are Adam, researching a Canadian employer to help tailor a candidate's application. Return ONLY JSON: {"name","sector","size","mission","values":[string],"notes"}. Use your knowledge. If you don't know the company, say so honestly in "notes" and provide nulls. Do not fabricate specifics.`;

const adaptSystem = `You are Adam, a sincere Canadian resume expert. Adapt the candidate's master CV to this specific job offer.
Rules:
- Keep the candidate's voice and real experience. Never invent metrics, jobs, or skills they don't have.
- Reorder experiences to lead with the most relevant to THIS offer.
- Rewrite bullets to mirror the offer's language and required skills where the candidate genuinely has that experience. Quantify using the candidate's own numbers.
- Add 1-3 NEW bullets per relevant experience that better surface transferable skills the offer asks for, grounded in what you know about the candidate. Mark these clearly.
- Drop bullets that are irrelevant to this role if it tightens the CV.
- Adjust the summary to position the candidate for this specific role.
- Tune coreCompetencies to match the offer's must-have and nice-to-have skills (only skills the candidate actually has).
- Respect Canadian resume norms: no photo, no DOB, reverse-chronological, action verbs, quantified.
- Detect the offer's language and write the CV in that language.
Return ONLY JSON: {"cv": <full CvJson>, "coverLetter": string, "notes": string}.
The coverLetter must follow Canadian business-letter format, addressed to the hiring manager, 3 paragraphs, in the offer's language.`;

export async function registerOfferRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/offers  -> create + parse an offer from pasted text
  app.post("/offers", async (req, reply) => {
    const me = await requireUser(req);
    const body = z.object({ text: z.string().min(50).max(20000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const parsed = await chatJson(
      [
        { role: "system", content: parseOfferSystem },
        { role: "user", content: `OFFER TEXT:\n"""\n${body.data.text}\n"""` },
      ],
      offerSchema,
      { maxTokens: 3000, temperature: 0.2 },
    ).catch((e) => {
      req.log.error({ err: String(e) }, "offer parse failed");
      throw { statusCode: 502, message: "Offer parsing failed; try again" };
    });

    const [offer] = await db
      .insert(schema.offers)
      .values({
        userId: me.id,
        raw: body.data.text,
        parsedJson: parsed as OfferParsed,
      })
      .returning({ id: schema.offers.id, parsedJson: schema.offers.parsedJson });

    return { offer };
  });

  // GET /api/offers  -> list user's offers
  app.get("/offers", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select({
        id: schema.offers.id,
        parsedJson: schema.offers.parsedJson,
        atsScore: schema.offers.atsScore,
        createdAt: schema.offers.createdAt,
      })
      .from(schema.offers)
      .where(eq(schema.offers.userId, me.id))
      .orderBy(desc(schema.offers.createdAt));
    return { offers: rows };
  });

  // GET /api/offers/:id
  app.get("/offers/:id", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const rows = await db
      .select()
      .from(schema.offers)
      .where(eq(schema.offers.id, id))
      .limit(1);
    const offer = rows[0];
    if (!offer || offer.userId !== me.id) return reply.code(404).send({ error: "Not found" });
    return { offer };
  });

  // POST /api/offers/:id/research  -> company research
  app.post("/offers/:id/research", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const rows = await db.select().from(schema.offers).where(eq(schema.offers.id, id)).limit(1);
    const offer = rows[0];
    if (!offer || offer.userId !== me.id) return reply.code(404).send({ error: "Not found" });

    const companyName = offer.parsedJson?.company;
    if (!companyName) return reply.code(400).send({ error: "No company name in offer" });

    const research = await chatJson(
      [
        { role: "system", content: researchSystem },
        { role: "user", content: `Company: ${companyName}\nOffer context: ${JSON.stringify(offer.parsedJson).slice(0, 1000)}` },
      ],
      z.object({
        name: z.string().nullable().optional(),
        sector: z.string().nullable().optional(),
        size: z.string().nullable().optional(),
        mission: z.string().nullable().optional(),
        values: z.array(z.string()).optional(),
        notes: z.string().nullable().optional(),
      }).passthrough(),
      { maxTokens: 2500, temperature: 0.3 },
    ).catch((e) => {
      req.log.error({ err: String(e) }, "research failed");
      throw { statusCode: 502, message: "Company research failed" };
    });

    await db
      .update(schema.offers)
      .set({ companyResearch: research as CompanyResearch })
      .where(eq(schema.offers.id, id));

    return { research };
  });

  // POST /api/offers/:id/adapt  -> generate tailored CV + cover letter + diff
  app.post("/offers/:id/adapt", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };

    const offerRows = await db.select().from(schema.offers).where(eq(schema.offers.id, id)).limit(1);
    const offer = offerRows[0];
    if (!offer || offer.userId !== me.id) return reply.code(404).send({ error: "Offer not found" });

    const profileRows = await db
      .select()
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.id))
      .limit(1);
    const profile = profileRows[0];
    if (!profile?.cvJson || Object.keys(profile.cvJson).length === 0) {
      return reply.code(409).send({ error: "Build or import your master CV first" });
    }

    const baseCv = profile.cvJson;
    const langNote = offer.parsedJson?.language === "fr"
      ? "Write the adapted CV and cover letter in Canadian French."
      : "Write the adapted CV and cover letter in English.";

    const result = await chatJson(
      [
        { role: "system", content: `${adaptSystem}\n${langNote}` },
        {
          role: "user",
          content: JSON.stringify({
            masterCv: baseCv,
            offer: offer.parsedJson,
            companyResearch: offer.companyResearch ?? null,
            writingStyle: profile.writingStyle ?? {},
          }).slice(0, 16000),
        },
      ],
      z.object({
        cv: z.any(),
        coverLetter: z.string(),
        notes: z.string().optional(),
      }).passthrough(),
      { maxTokens: 9000, temperature: 0.4 },
    ).catch((e) => {
      req.log.error({ err: String(e) }, "adapt failed");
      throw { statusCode: 502, message: "Adaptation failed; try again" };
    });

    const variantCv = normalizeCv(result.cv);
    const changes = diffCv(baseCv, variantCv);
    const scores = validateCanadianCv(variantCv);

    // Persist the application (draft) with the variant + cover letter
    const [application] = await db
      .insert(schema.applications)
      .values({
        userId: me.id,
        offerId: id,
        cvVariantJson: variantCv,
        coverLetter: result.coverLetter,
        status: "draft",
      })
      .returning({ id: schema.applications.id });

    return {
      applicationId: application.id,
      variant: variantCv,
      coverLetter: result.coverLetter,
      notes: result.notes ?? "",
      changes,
      scores,
      baseCv,
    };
  });

  // GET /api/applications/:id
  app.get("/applications/:id", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const rows = await db
      .select({
        id: schema.applications.id,
        userId: schema.applications.userId,
        status: schema.applications.status,
        coverLetter: schema.applications.coverLetter,
        cvVariantJson: schema.applications.cvVariantJson,
        offer: {
          id: schema.offers.id,
          parsedJson: schema.offers.parsedJson,
        },
      })
      .from(schema.applications)
      .innerJoin(schema.offers, eq(schema.applications.offerId, schema.offers.id))
      .where(eq(schema.applications.id, id))
      .limit(1);
    const application = rows[0];
    if (!application || application.userId !== me.id) return reply.code(404).send({ error: "Application not found" });
    return { application };
  });

  // POST /api/applications/:id/accept  -> apply accepted changes, finalize
  app.post("/applications/:id/accept", async (req, reply) => {
    const me = await requireUser(req);
    const { id } = req.params as { id: string };
    const body = z.object({
      acceptedChangeIds: z.array(z.string()),
      changes: z.array(z.object({
        id: z.string(),
        kind: z.string(),
        section: z.string(),
        experienceKey: z.string().optional(),
        oldValue: z.string().nullable().optional(),
        newValue: z.string().nullable().optional(),
        oldIndex: z.number().nullable().optional(),
        newIndex: z.number().nullable().optional(),
      }).passthrough()),
      coverLetter: z.string().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const appRows = await db.select().from(schema.applications).where(eq(schema.applications.id, id)).limit(1);
    const application = appRows[0];
    if (!application || application.userId !== me.id) return reply.code(404).send({ error: "Application not found" });

    const profileRows = await db.select().from(schema.masterProfiles).where(eq(schema.masterProfiles.userId, me.id)).limit(1);
    const profile = profileRows[0];
    const baseCv = profile?.cvJson ?? {};

    const accepted = new Set(body.data.acceptedChangeIds);
    const finalCv = applyChanges(baseCv, body.data.changes as CvChange[], accepted);

    // M7: update the per-user preference vector based on this feedback.
    // Accepted changes = "keep", rejected = "reject". No LLM involved.
    const { applyFeedback } = await import("../lib/preference-vector.js");
    let prefVector = profile?.preferenceVector ?? {};
    for (const change of body.data.changes) {
      const isKeep = accepted.has(change.id);
      const text = change.newValue ?? change.oldValue ?? "";
      if (text) {
        prefVector = applyFeedback(prefVector, isKeep ? "keep" : "reject", text);
      }
    }
    if (profile) {
      await db
        .update(schema.masterProfiles)
        .set({ preferenceVector: prefVector, updatedAt: new Date() })
        .where(eq(schema.masterProfiles.userId, me.id));
    }

    await db
      .update(schema.applications)
      .set({
        cvVariantJson: finalCv,
        coverLetter: body.data.coverLetter ?? application.coverLetter,
        status: "finalized",
      })
      .where(eq(schema.applications.id, id));

    return { ok: true, applicationId: id, finalCv };
  });

  // GET /api/applications  -> list user's applications
  app.get("/applications", async (req) => {
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
      .where(eq(schema.applications.userId, me.id))
      .orderBy(desc(schema.applications.createdAt));
    return { applications: rows };
  });
}
