import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth.js";
import { chatJson, chat } from "../lib/llm.js";
import { validateCanadianCv } from "../lib/canadian-cv.js";
import { normalizeCv } from "../lib/normalize-cv.js";
import type { CvJson } from "../db/schema.js";

// Education/experience sometimes come back as a single object from the LLM.
// We accept either an object or an array and coerce to an array in normalizeCv.
const arrayish = <T extends z.ZodTypeAny>(s: T) =>
  z.union([z.array(s), z.record(z.any()).transform((o) => [o]).pipe(z.array(s)), z.null().transform(() => [] as z.infer<z.ZodArray<T>>)])
    .optional();

const cvSchema = z
  .object({
    contact: z.any().optional(),
    summary: z.string().optional(),
    coreCompetencies: z.array(z.string()).optional(),
    experience: arrayish(z.any()),
    education: arrayish(z.any()),
    languages: arrayish(z.any()),
    certifications: arrayish(z.string()),
    volunteer: arrayish(z.string()),
    awards: arrayish(z.string()),
  })
  .passthrough();

const builderSystem = `You are Adam, a sincere Canadian resume expert. Build a complete, ATS-compliant Canadian-style resume as JSON.
Canadian rules (hard):
- No photo, no date of birth, no marital status, no religion, no SIN.
- Reverse-chronological order.
- Each bullet starts with a strong action verb and is quantified when the candidate gave any number/scale.
- Keep the candidate's voice; never invent metrics. If a metric is missing, write a strong qualitative bullet and add a question to "questions".
- Sections: contact, summary (2-3 lines), coreCompetencies (8-12), experience (with bullets), education, languages, certifications (optional), volunteer (optional), awards (optional).
Return ONLY JSON: {"cv": <CvJson>, "questions": [string]}`;

export async function registerCvBuilderRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/cv/validate  -> live scorecard (no LLM)
  app.post("/cv/validate", async (req, reply) => {
    await requireUser(req);
    const body = cvSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const result = validateCanadianCv(body.data as CvJson);
    return result;
  });

  // POST /api/cv/build  -> guided interview first question OR full build from answers
  // Phase "interview": { phase: "interview", seed: {...minimal inputs} } -> { questions: string[] }
  // Phase "build":     { phase: "build", answers: {...}, targetRole?: string } -> { cv, questions, scores }
  app.post("/cv/build", async (req, reply) => {
    const me = await requireUser(req);
    const body = z
      .object({
        phase: z.enum(["interview", "build"]),
        seed: z.record(z.string(), z.any()).optional(),
        answers: z.record(z.string(), z.string()).optional(),
        targetRole: z.string().max(300).optional(),
        locale: z.enum(["fr", "en"]).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const locale = body.data.locale ?? "fr";
    const langNote = locale === "fr" ? "Write the resume in Canadian French." : "Write the resume in English.";

    if (body.data.phase === "interview") {
      const seed = body.data.seed ?? {};
      const raw = await chat(
        [
          { role: "system", content: `${builderSystem}\n${langNote}\nBased on the seed inputs, ask 5 to 8 sharp questions to gather what you need to build a complete, quantified resume. Return ONLY {"questions":[string]}.` },
          { role: "user", content: JSON.stringify(seed).slice(0, 6000) },
        ],
        { maxTokens: 3000, temperature: 0.3, jsonMode: true },
      );
      let qs: string[] = [];
      try { qs = (JSON.parse(raw).questions ?? []).slice(0, 8); } catch { qs = [raw]; }
      return { phase: "interview", questions: qs };
    }

    // phase === "build"
    const answers = body.data.answers ?? {};
    const payload = { targetRole: body.data.targetRole ?? null, answers };
    const result = await chatJson(
      [
        { role: "system", content: `${builderSystem}\n${langNote}` },
        { role: "user", content: JSON.stringify(payload).slice(0, 10000) },
      ],
      z.object({ cv: cvSchema, questions: z.array(z.string()) }),
      { maxTokens: 8000, temperature: 0.4 },
    ).catch((e) => {
      req.log.error({ err: String(e) }, "cv build failed");
      throw { statusCode: 502, message: "CV generation failed; try again" };
    });

    const cv = normalizeCv(result.cv);
    const scores = validateCanadianCv(cv);

    // persist into master profile
    await db
      .update(schema.masterProfiles)
      .set({ cvJson: cv, updatedAt: new Date() })
      .where(eq(schema.masterProfiles.userId, me.id));

    return { phase: "build", cv, questions: result.questions, scores };
  });

  // GET /api/cv/mine -> the stored CV
  app.get("/cv/mine", async (req) => {
    const me = await requireUser(req);
    const rows = await db
      .select({ cvJson: schema.masterProfiles.cvJson })
      .from(schema.masterProfiles)
      .where(eq(schema.masterProfiles.userId, me.id))
      .limit(1);
    return { cv: rows[0]?.cvJson ?? null };
  });
}
