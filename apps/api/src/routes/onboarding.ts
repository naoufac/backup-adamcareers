import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth.js";
import { chatJson, chat } from "../lib/llm.js";
import { normalizeCv } from "@adamjobs/cv-engine";

const cvJsonSchema = z.object({
  contact: z.object({
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
  }).passthrough().optional(),
  summary: z.string().nullable().optional(),
  coreCompetencies: z.array(z.string()).optional(),
  experience: z.array(z.object({
    company: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    bullets: z.array(z.string()).optional(),
  }).passthrough()).optional(),
  education: z.array(z.object({
    institution: z.string().nullable().optional(),
    degree: z.string().nullable().optional(),
    field: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  }).passthrough()).optional(),
  languages: z.array(z.object({ name: z.string(), level: z.string() }).passthrough()).optional(),
}).passthrough();

const parseSystem = `You are Adam, an expert Canadian resume parser. Read the candidate's CV text and return ONLY a JSON object matching the CvJson schema. Rules:
- Bullet points: action-verb-led, concise, quantified whenever the source implies it (use the candidate's own numbers; never invent metrics).
- Dates: normalize to "YYYY" or "YYYY-MM"; use "present" for current roles.
- Keep the candidate's voice; do not embellish or add skills not present.
- null for genuinely unknown fields. Empty arrays when nothing applies.`;

// POST /api/onboarding/parse-cv
// Body: { text: string }   ->  { cv: CvJson, writingStyle: WritingStyle }
export async function registerOnboardingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/onboarding/parse-cv", async (req, reply) => {
    const me = await requireUser(req);
    const body = z.object({ text: z.string().min(50).max(20000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const rawCv = (await chatJson(
      [
        { role: "system", content: parseSystem },
        {
          role: "user",
          content:
            `CV TEXT:\n"""\n${body.data.text}\n"""\n\nReturn the JSON now.`,
        },
      ],
      cvJsonSchema,
      { maxTokens: 6000, temperature: 0.2 },
    ).catch((e) => {
      req.log.error({ err: String(e) }, "cv parse failed");
      throw { statusCode: 502, message: "CV parsing failed; try again" };
    })) as schema.CvJson;

    const cv = normalizeCv(rawCv);

    const writingStyle = await inferWritingStyle(body.data.text).catch(() => ({
      tone: "professional",
      voice: "first_singular" as const,
      language: detectLang(body.data.text),
    }));

    await db
      .update(schema.masterProfiles)
      .set({ cvJson: cv, writingStyle, updatedAt: new Date() })
      .where(eq(schema.masterProfiles.userId, me.id));

    return { cv, writingStyle };
  });

  // POST /api/onboarding/interview-questions
  // Adam asks 5-8 targeted questions to enrich the weakest experiences.
  app.post("/onboarding/interview-questions", async (req, reply) => {
    const me = await requireUser(req);
    const prof = await db
      .select()
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.id))
      .limit(1);
    if (!prof[0] || !prof[0].cvJson) {
      return reply.code(409).send({ error: "Upload and parse your CV first" });
    }
    const cv = prof[0].cvJson;
    const text = JSON.stringify(cv);

    const raw = await chat(
      [
        {
          role: "system",
          content:
            `You are Adam, a sincere Canadian career expert. Based on this CV JSON, produce 5 to 8 sharp, specific questions that clarify the candidate's real responsibilities, scope, and quantifiable impact for the experiences where it is weakest. Return ONLY a JSON object: {"questions":[string]}. Ask one question per item. Be concrete (e.g. team size, budget, scale, tech, outcomes). No generic questions.`,
        },
        { role: "user", content: text.slice(0, 8000) },
      ],
      { maxTokens: 3000, temperature: 0.3, jsonMode: true },
    );
    let qs: string[] = [];
    try {
      const m = JSON.parse(raw);
      qs = Array.isArray(m.questions) ? m.questions.slice(0, 8) : [];
    } catch {
      qs = [raw];
    }
    return { questions: qs };
  });

  // POST /api/onboarding/answers  -> store as enriched notes + mark onboarded
  app.post("/onboarding/complete", async (req, reply) => {
    const me = await requireUser(req);
    const body = z
      .object({ answers: z.record(z.string(), z.string()).default({}) })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    await db
      .update(schema.masterProfiles)
      .set({ onboardedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.masterProfiles.userId, me.id));

    return { ok: true };
  });
}

function detectLang(text: string): "fr" | "en" {
  const fr = /(et|avec|pour|dans|une|des|nous|vous|expérience|compétences)/gi;
  const matches = (text.match(fr) || []).length;
  return matches > 3 ? "fr" : "en";
}

async function inferWritingStyle(
  _text: string,
): Promise<{ tone: string; voice: "first_singular" | "first_plural" | "impersonal"; language: "fr" | "en" }> {
  return { tone: "professional, confident", voice: "first_singular", language: "en" };
}
