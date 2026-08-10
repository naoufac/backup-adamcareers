import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";
import { requireUser } from "./auth.js";
import { cvToText, coverLetterToText } from "../lib/export-text.js";
import { cvToHtml, coverLetterToHtml } from "../lib/export-html.js";
import { cvToDocx, coverLetterToDocx } from "../lib/export-docx.js";
import type { CvJson } from "../db/schema.js";

const FREE_EXPORTS_TOTAL = 4;

const bodySchema = z.object({
  applicationId: z.string().uuid().optional(),
  cv: z.any().optional(),
  coverLetter: z.string().optional(),
});

async function resolveInputs(me: { id: string }, body: z.infer<typeof bodySchema>) {
  let cv: CvJson | undefined;
  let coverLetter: string | undefined;

  if (body.applicationId) {
    const rows = await db.select().from(schema.applications).where(eq(schema.applications.id, body.applicationId)).limit(1);
    const application = rows[0];
    if (!application || application.userId !== me.id) {
      throw { statusCode: 404, message: "Application not found" };
    }
    cv = (application.cvVariantJson ?? {}) as CvJson;
    coverLetter = application.coverLetter ?? body.coverLetter;
  } else if (body.cv) {
    cv = body.cv as CvJson;
    coverLetter = body.coverLetter;
  }

  if (!cv) {
    throw { statusCode: 400, message: "Provide applicationId or cv in body" };
  }

  return { cv, coverLetter };
}

async function checkUsageGate(me: { id: string }): Promise<{ allowed: boolean; paid: boolean }> {
  const rows = await db
    .select({ freeExportsUsed: schema.masterProfiles.freeExportsUsed, paid: schema.masterProfiles.paid })
    .from(schema.masterProfiles)
    .where(eq(schema.masterProfiles.userId, me.id))
    .limit(1);
  const profile = rows[0];
  if (!profile) return { allowed: false, paid: false };
  if (profile.paid) return { allowed: true, paid: true };
  if (profile.freeExportsUsed < FREE_EXPORTS_TOTAL) return { allowed: true, paid: false };
  return { allowed: false, paid: false };
}

async function incrementUsage(me: { id: string }): Promise<void> {
  const rows = await db
    .select({ id: schema.masterProfiles.id, freeExportsUsed: schema.masterProfiles.freeExportsUsed, paid: schema.masterProfiles.paid })
    .from(schema.masterProfiles)
    .where(eq(schema.masterProfiles.userId, me.id))
    .limit(1);
  const profile = rows[0];
  if (!profile || profile.paid) return;
  if (profile.freeExportsUsed < FREE_EXPORTS_TOTAL) {
    await db
      .update(schema.masterProfiles)
      .set({ freeExportsUsed: profile.freeExportsUsed + 1 })
      .where(eq(schema.masterProfiles.id, profile.id));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puppeteerLib: any = null;
let puppeteerLoadError: string | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPuppeteer(): Promise<any | null> {
  if (puppeteerLib) return puppeteerLib;
  try {
    puppeteerLib = await import("puppeteer");
    return puppeteerLib;
  } catch (e) {
    puppeteerLoadError = e instanceof Error ? e.message : String(e);
    return null;
  }
}

export async function registerExportRoutes(app: FastifyInstance): Promise<void> {
  // ─── TXT exports (existing, kept working) ───

  app.post("/export/cv/txt", async (req, reply) => {
    const me = await requireUser(req);
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid request" });
    const { cv } = await resolveInputs(me, body.data);
    const text = cvToText(cv);
    reply.header("Content-Type", "text/plain; charset=utf-8");
    reply.header("Content-Disposition", 'attachment; filename="cv-adamcareers.txt"');
    return reply.send(text);
  });

  app.post("/export/cover-letter/txt", async (req, reply) => {
    await requireUser(req);
    const body = z.object({ text: z.string(), cv: z.any().optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid letter" });
    const text = coverLetterToText(body.data.text);
    reply.header("Content-Type", "text/plain; charset=utf-8");
    reply.header("Content-Disposition", 'attachment; filename="lettre-adamcareers.txt"');
    return reply.send(text);
  });

  // ─── PDF exports ───

  app.post("/export/cv/pdf", async (req, reply) => {
    const me = await requireUser(req);
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid request" });
    const gate = await checkUsageGate(me);
    if (!gate.allowed) {
      return reply.code(402).send({ error: "Payment required", checkoutUrl: null });
    }
    const { cv } = await resolveInputs(me, body.data);

    const puppeteer = await getPuppeteer();
    if (!puppeteer) {
      app.log.warn(`puppeteer not available: ${puppeteerLoadError}`);
      const html = cvToHtml(cv);
      reply.header("Content-Type", "text/html; charset=utf-8");
      reply.header("Content-Disposition", 'attachment; filename="cv-adamcareers.html"');
      return reply.send(html);
    }

    const html = cvToHtml(cv);
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({
        format: "Letter",
        printBackground: true,
        margin: { top: "0.5in", bottom: "0.5in", left: "0.75in", right: "0.75in" },
      });
      await incrementUsage(me);
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", 'attachment; filename="cv-adamcareers.pdf"');
      return reply.send(pdf);
    } finally {
      await browser.close();
    }
  });

  app.post("/export/cover-letter/pdf", async (req, reply) => {
    const me = await requireUser(req);
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid request" });
    const gate = await checkUsageGate(me);
    if (!gate.allowed) {
      return reply.code(402).send({ error: "Payment required", checkoutUrl: null });
    }
    const { cv, coverLetter } = await resolveInputs(me, body.data);
    if (!coverLetter) return reply.code(400).send({ error: "No cover letter available" });

    const puppeteer = await getPuppeteer();
    if (!puppeteer) {
      app.log.warn(`puppeteer not available: ${puppeteerLoadError}`);
      const html = coverLetterToHtml(coverLetter, cv);
      reply.header("Content-Type", "text/html; charset=utf-8");
      reply.header("Content-Disposition", 'attachment; filename="lettre-adamcareers.html"');
      return reply.send(html);
    }

    const html = coverLetterToHtml(coverLetter, cv);
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({
        format: "Letter",
        printBackground: true,
        margin: { top: "0.75in", bottom: "0.75in", left: "0.75in", right: "0.75in" },
      });
      await incrementUsage(me);
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", 'attachment; filename="lettre-adamcareers.pdf"');
      return reply.send(pdf);
    } finally {
      await browser.close();
    }
  });

  // ─── DOCX exports ───

  app.post("/export/cv/docx", async (req, reply) => {
    const me = await requireUser(req);
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid request" });
    const gate = await checkUsageGate(me);
    if (!gate.allowed) {
      return reply.code(402).send({ error: "Payment required", checkoutUrl: null });
    }
    const { cv } = await resolveInputs(me, body.data);

    const buf = await cvToDocx(cv);
    await incrementUsage(me);
    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    reply.header("Content-Disposition", 'attachment; filename="cv-adamcareers.docx"');
    return reply.send(buf);
  });

  app.post("/export/cover-letter/docx", async (req, reply) => {
    const me = await requireUser(req);
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid request" });
    const gate = await checkUsageGate(me);
    if (!gate.allowed) {
      return reply.code(402).send({ error: "Payment required", checkoutUrl: null });
    }
    const { cv, coverLetter } = await resolveInputs(me, body.data);
    if (!coverLetter) return reply.code(400).send({ error: "No cover letter available" });

    const buf = await coverLetterToDocx(coverLetter, cv);
    await incrementUsage(me);
    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    reply.header("Content-Disposition", 'attachment; filename="lettre-adamcareers.docx"');
    return reply.send(buf);
  });

  // ─── Existing GET routes for TXT (kept working) ───

  app.get("/applications/:id/export/:kind", async (req, reply) => {
    const me = await requireUser(req);
    const { id, kind } = req.params as { id: string; kind: string };
    const rows = await db.select().from(schema.applications).where(eq(schema.applications.id, id)).limit(1);
    const application = rows[0];
    if (!application || application.userId !== me.id) return reply.code(404).send({ error: "Not found" });

    if (kind === "cv") {
      const text = cvToText((application.cvVariantJson ?? {}) as CvJson);
      reply.header("Content-Type", "text/plain; charset=utf-8");
      reply.header("Content-Disposition", 'attachment; filename="cv-adamcareers.txt"');
      return reply.send(text);
    }
    if (kind === "cover_letter" || kind === "cover-letter") {
      const text = coverLetterToText(application.coverLetter ?? "");
      reply.header("Content-Type", "text/plain; charset=utf-8");
      reply.header("Content-Disposition", 'attachment; filename="lettre-adamcareers.txt"');
      return reply.send(text);
    }
    return reply.code(400).send({ error: "Unknown export kind" });
  });
}
