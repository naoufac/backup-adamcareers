import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../lib/require-user.js";
import { chat, chatJson } from "../lib/llm.js";
import type { CvJson, OfferParsed } from "../db/schema.js";

// Education/experience sometimes come back as a single object from the LLM.
const arrayish = <T extends z.ZodTypeAny>(s: T) =>
  z.union([
    z.array(s),
    z.record(z.any()).transform((o) => [o]).pipe(z.array(s)),
    z.null().transform(() => [] as z.infer<z.ZodArray<T>>),
  ]).optional();

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

const parseSystem = `You are Adam, an expert Canadian resume parser. Read the candidate's CV text and return ONLY a JSON object matching the CvJson schema. Rules:
- Bullet points: action-verb-led, concise, quantified whenever the source implies it (use the candidate's own numbers; never invent metrics).
- Dates: normalize to "YYYY" or "YYYY-MM"; use "present" for current roles.
- Keep the candidate's voice; do not embellish or add skills not present.
- null for genuinely unknown fields. Empty arrays when nothing applies.`;

const builderSystem = `You are Adam, a sincere Canadian resume expert. Build a complete, ATS-compliant Canadian-style resume as JSON.
Canadian rules (hard):
- No photo, no date of birth, no marital status, no religion, no SIN.
- Reverse-chronological order.
- Each bullet starts with a strong action verb and is quantified when the candidate gave any number/scale.
- Keep the candidate's voice; never invent metrics. If a metric is missing, write a strong qualitative bullet and add a question to "questions".
- Sections: contact, summary (2-3 lines), coreCompetencies (8-12), experience (with bullets), education, languages, certifications (optional), volunteer (optional), awards (optional).
Return ONLY JSON: {"cv": <CvJson>, "questions": [string]}`;

const interviewSystem = `You are Adam, a sincere Canadian career expert. Based on this CV JSON, produce 5 to 8 sharp, specific questions that clarify the candidate's real responsibilities, scope, and quantifiable impact for the experiences where it is weakest. Return ONLY a JSON object: {"questions":[string]}. Ask one question per item. Be concrete (e.g. team size, budget, scale, tech, outcomes). No generic questions.`;

const offerParseSystem = `You are Adam, a Canadian job-offer parser. Read the offer text and return ONLY JSON: {"title","company","location","workMode","mustHaveSkills":[string],"niceToHaveSkills":[string],"responsibilities":[string],"language":"fr"|"en","salary"}. Infer language from offer text. Leave null/empty when not found. Do not invent requirements.`;

const coverLetterSystem = `You are Adam, a Canadian application coach. Write a concise, sincere cover letter in Canadian business-letter format (addressed to the hiring manager, 3 paragraphs) in the offer's language. Never invent candidate facts or skills. Return ONLY JSON: {"coverLetter": string}.`;

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

export async function registerGenerateRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/onboarding/parse-cv
  app.post("/onboarding/parse-cv", async (req, reply) => {
    await requireUser(req);
    const body = z.object({ text: z.string().min(50).max(20000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const rawCv = await chatJson(
      [
        { role: "system", content: parseSystem },
        { role: "user", content: `CV TEXT:\n"""\n${body.data.text}\n"""\n\nReturn the JSON now.` },
      ],
      cvSchema,
      { maxTokens: 6000, temperature: 0.2 },
    ).catch((e) => {
      req.log.error({ err: String(e) }, "cv parse failed");
      throw { statusCode: 502, message: "CV parsing failed; try again" };
    });

    const writingStyle = {
      tone: "professional, confident",
      voice: "first_singular" as const,
      language: detectLang(body.data.text),
    };

    return { cv: rawCv, writingStyle };
  });

  // POST /api/onboarding/interview-questions
  app.post("/onboarding/interview-questions", async (req) => {
    await requireUser(req);
    const body = z.object({ cv: z.record(z.any()).optional() }).safeParse(req.body);
    const cv = body.success ? (body.data.cv ?? {}) : {};
    const raw = await chat(
      [
        { role: "system", content: interviewSystem },
        { role: "user", content: JSON.stringify(cv).slice(0, 8000) },
      ],
      { maxTokens: 3000, temperature: 0.3, jsonMode: true },
    );
    let qs: string[] = [];
    try {
      qs = (JSON.parse(raw).questions ?? []).slice(0, 8);
    } catch {
      qs = [raw];
    }
    return { questions: qs };
  });

  // POST /api/cv/build
  app.post("/cv/build", async (req, reply) => {
    await requireUser(req);
    const body = z.object({
      phase: z.enum(["interview", "build"]),
      seed: z.record(z.string(), z.any()).optional(),
      answers: z.record(z.string(), z.string()).optional(),
      targetRole: z.string().max(300).optional(),
      locale: z.enum(["fr", "en"]).optional(),
    }).safeParse(req.body);
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

    const payload = { targetRole: body.data.targetRole ?? null, answers: body.data.answers ?? {} };
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

    return { phase: "build", cv: result.cv, questions: result.questions };
  });

  // POST /api/offers/parse
  app.post("/offers/parse", async (req, reply) => {
    await requireUser(req);
    const body = z.object({ raw: z.string().min(50).max(20000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const parsed = await chatJson(
      [
        { role: "system", content: offerParseSystem },
        { role: "user", content: body.data.raw.slice(0, 12000) },
      ],
      z.object({
        title: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        workMode: z.string().nullable().optional(),
        mustHaveSkills: z.array(z.string()).nullish(),
        niceToHaveSkills: z.array(z.string()).nullish(),
        responsibilities: z.array(z.string()).nullish(),
        language: z.enum(["fr", "en"]).optional(),
        salary: z.string().nullable().optional(),
      }).passthrough(),
      { maxTokens: 2500, temperature: 0.2 },
    ).catch((e) => {
      req.log.error({ err: String(e) }, "offer parse failed");
      throw { statusCode: 502, message: "Offer parsing failed; try again" };
    });

    return { parsed };
  });

  // POST /api/offers/research
  app.post("/offers/research", async (req, reply) => {
    await requireUser(req);
    const body = z.object({ company: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const research = await chatJson(
      [
        { role: "system", content: researchSystem },
        { role: "user", content: `Company: ${body.data.company}` },
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

    return { research };
  });

  // POST /api/offers/adapt
  app.post("/offers/adapt", async (req, reply) => {
    await requireUser(req);
    const body = z.object({
      cv: z.record(z.any()),
      offer: z.record(z.any()),
      writingStyle: z.record(z.any()).optional(),
      companyResearch: z.record(z.any()).optional(),
      locale: z.enum(["fr", "en"]).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const cv = body.data.cv as CvJson;
    const offer = body.data.offer as OfferParsed;
    const locale = body.data.locale ?? offer.language ?? "en";
    const langNote = locale === "fr"
      ? "Write the adapted CV and cover letter in Canadian French."
      : "Write the adapted CV and cover letter in English.";

    const result = await chatJson(
      [
        { role: "system", content: `${adaptSystem}\n${langNote}` },
        {
          role: "user",
          content: JSON.stringify({
            masterCv: cv,
            offer,
            companyResearch: body.data.companyResearch ?? null,
            writingStyle: body.data.writingStyle ?? {},
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

    return {
      cv: result.cv as CvJson,
      coverLetter: result.coverLetter,
      notes: result.notes ?? "",
    };
  });

  // POST /api/offers/cover-letter
  app.post("/offers/cover-letter", async (req, reply) => {
    await requireUser(req);
    const body = z.object({
      cv: z.record(z.any()),
      offer: z.record(z.any()),
      locale: z.enum(["fr", "en"]).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

    const cv = body.data.cv as CvJson;
    const offer = body.data.offer as OfferParsed;
    const locale = body.data.locale ?? offer.language ?? "en";
    const langNote = locale === "fr" ? "Write in Canadian French." : "Write in English.";

    const result = await chatJson(
      [
        { role: "system", content: `${coverLetterSystem}\n${langNote}` },
        { role: "user", content: JSON.stringify({ cv, offer }).slice(0, 12000) },
      ],
      z.object({ coverLetter: z.string() }),
      { maxTokens: 2000, temperature: 0.4 },
    ).catch((e) => {
      req.log.error({ err: String(e) }, "cover letter failed");
      throw { statusCode: 502, message: "Cover letter generation failed; try again" };
    });

    return { coverLetter: result.coverLetter };
  });
}

function detectLang(text: string): "fr" | "en" {
  const fr = /(et|avec|pour|dans|une|des|nous|vous|expérience|compétences)/gi;
  const matches = (text.match(fr) || []).length;
  return matches > 3 ? "fr" : "en";
}
