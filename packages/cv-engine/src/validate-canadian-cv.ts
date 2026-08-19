import type { CvJson, Scorecard, Violation } from "./types.js";

// Canadian resume compliance rules. Pure logic, no LLM. Drives the live scorecard.

const ACTION_VERBS = [
  "led","built","designed","developed","launched","drove","delivered","shipped",
  "increased","reduced","improved","automated","architected","managed","created",
  "implemented","optimized","mentored","spearheaded","negotiated","analyzed",
  "established","streamlined","transformed","grew","saved","generated","owned",
];

const FORBIDDEN_PERSONAL = [
  "date of birth","dob","age","marital status","religion","nationality",
  "photo","gender","social insurance","sin ","dependents",
];

const QUANT_HINT = /(\d+%|\$\s?\d|\d{2,}\+?|\b\d{2,}\s?(users|customers|clients|k|m|million|thousand|hours|weeks|months|years|people|reports|projects|stores|merchants))\b/i;

export function validateCanadianCv(cv: CvJson): Scorecard {
  const v: Violation[] = [];

  // --- Forbidden personal info (Canadian compliance: errors) ---
  const blob = JSON.stringify(cv).toLowerCase();
  for (const f of FORBIDDEN_PERSONAL) {
    if (blob.includes(f)) {
      v.push({
        id: `forbidden:${f}`,
        severity: "error",
        message: `Remove "${f.trim()}" — not used in Canadian resumes and can trigger bias.`,
      });
    }
  }

  // --- Contact block ---
  const c = cv.contact ?? {};
  if (!c.name) v.push({ id: "contact:name", severity: "error", message: "Add your full name at the top." });
  if (!c.email) v.push({ id: "contact:email", severity: "error", message: "Add a professional email." });
  if (!c.phone) v.push({ id: "contact:phone", severity: "warning", message: "Add a Canadian phone number." });
  if (!c.location) v.push({ id: "contact:location", severity: "warning", message: "Add your city/province (e.g. Toronto, ON)." });

  // --- Summary ---
  if (!cv.summary || cv.summary.trim().length < 40) {
    v.push({ id: "summary:missing", severity: "warning", message: "Add a 2-3 line professional summary." });
  } else if (cv.summary.length > 600) {
    v.push({ id: "summary:long", severity: "warning", message: "Summary is long; keep it to 3 lines." });
  }

  // --- Core competencies ---
  const skills = cv.coreCompetencies ?? [];
  if (skills.length < 6) {
    v.push({ id: "skills:few", severity: "warning", message: "List at least 6-10 core competencies (ATS keywords)." });
  }

  // --- Experience ---
  const exp = cv.experience ?? [];
  if (exp.length === 0) {
    v.push({ id: "exp:none", severity: "error", message: "Add at least one professional experience." });
  }
  for (const e of exp) {
    if (!e.title) v.push({ id: `exp:${e.company}:title`, severity: "error", message: `Experience at "${e.company ?? "?"}" has no title.` });
    if (!e.company) v.push({ id: `exp:no-company`, severity: "error", message: `An experience is missing the company name.` });
    const bullets = e.bullets ?? [];
    if (bullets.length < 2) {
      v.push({ id: `exp:${e.company}:bullets-few`, severity: "warning", message: `"${e.company ?? e.title}" needs at least 2-4 bullet points.` });
    }
    bullets.forEach((b, i) => {
      const first = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
      if (first && !ACTION_VERBS.includes(first) && !ACTION_VERBS.includes(b.trim().toLowerCase().split(/\s+/)[0] ?? "")) {
        const w = b.trim().split(/\s+/)[0] ?? "";
        if (!/[A-Z]/.test(w[0] ?? "") && !ACTION_VERBS.includes(first)) {
          v.push({ id: `exp:${e.company}:verb:${i}`, severity: "warning", message: `Bullet should start with a strong action verb: "${b.slice(0, 40)}...".` });
        }
      }
      if (!QUANT_HINT.test(b)) {
        v.push({ id: `exp:${e.company}:quant:${i}`, severity: "warning", message: `Quantify this bullet (numbers, %, scale): "${b.slice(0, 40)}...".` });
      }
      if (b.length > 220) {
        v.push({ id: `exp:${e.company}:len:${i}`, severity: "warning", message: `Bullet is too long (${b.length} chars); aim for one line.` });
      }
    });
  }

  // --- Education ---
  if ((cv.education ?? []).length === 0) {
    v.push({ id: "edu:none", severity: "warning", message: "Add your education section (Canadian employers expect it)." });
  }

  // --- Length heuristic (estimate pages) ---
  const bulletCount = exp.reduce((n, e) => n + (e.bullets?.length ?? 0), 0);
  const estLines = 8 + skills.length / 3 + exp.length * 2 + bulletCount + (cv.education?.length ?? 0) * 2;
  if (estLines > 95) {
    v.push({ id: "length:long", severity: "warning", message: "Resume likely exceeds 2 pages; Canadian norm is 1-2 pages." });
  }

  const errors = v.filter((x) => x.severity === "error").length;
  const warnings = v.filter((x) => x.severity === "warning").length;
  const complianceScore = clamp(100 - errors * 25 - warnings * 8);

  // ATS score: keyword density + quantification + completeness
  const quantified = exp.reduce(
    (n, e) => n + (e.bullets ?? []).filter((b) => QUANT_HINT.test(b)).length,
    0,
  );
  const quantRatio = bulletCount > 0 ? quantified / bulletCount : 0;
  const completeness = Math.min(1, (exp.length * 0.3 + skills.length / 10 + (cv.summary ? 0.2 : 0) + (cv.education?.length ?? 0) * 0.1));
  const atsScore = clamp(Math.round(quantRatio * 45 + completeness * 35 + Math.min(skills.length, 12) * 1.5 + (cv.contact?.email ? 2 : 0)));

  return { violations: v, complianceScore, atsScore };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
