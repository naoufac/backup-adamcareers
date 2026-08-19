// Deterministic, rule-based job-offer parser.
// Runs in the browser. No LLM. No server-only dependencies.

import type { OfferParsed } from "./types.js";

const SKILL_DELIMITERS = /[,;·|/]/;

export function parseOffer(text: string): OfferParsed {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  const lines = cleaned.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const lower = cleaned.toLowerCase();

  const offer: OfferParsed = {
    title: extractTitle(cleaned, lines),
    company: extractCompany(lines),
    location: extractLocation(lines),
    workMode: extractWorkMode(lower),
    mustHaveSkills: extractSkills(cleaned, lines, "required") || extractSkillsFromSections(cleaned, ["exigences", "requirements", "compétences requises", "required skills"]),
    niceToHaveSkills: extractSkillsFromSections(cleaned, ["atouts", "nice to have", "assets", "plus", "preferred", "serait un atout"]),
    responsibilities: extractResponsibilities(cleaned, lines),
    language: detectLanguage(cleaned),
    salary: extractSalary(cleaned),
  };

  // Fallback skill extraction: scan for common technical/business skill tokens.
  if (!offer.mustHaveSkills || offer.mustHaveSkills.length === 0) {
    offer.mustHaveSkills = extractSkillTokens(cleaned);
  }

  // Clean up empties and duplicates.
  offer.mustHaveSkills = uniqueClean(offer.mustHaveSkills);
  offer.niceToHaveSkills = uniqueClean(offer.niceToHaveSkills ?? []);
  offer.responsibilities = uniqueClean(offer.responsibilities ?? []);

  return offer;
}

function extractTitle(text: string, lines: string[]): string | undefined {
  // First non-empty line is often the title; split on common separators if present.
  const first = lines[0] ?? "";
  if (first.length > 3 && first.length < 120 && !first.toLowerCase().includes("postuler")) {
    const titlePart = first.split(/\s+[—–-]\s+/)[0] ?? first;
    return clean(titlePart);
  }

  // Common markers.
  const patterns = [
    /(?:job title|titre du poste|poste)\s*[:\-]\s*(.+)/i,
    /(?:nous recherchons\s+(?:un|une)\s+)?(.{5,80})(?:\n|$)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return clean(m[1]);
  }

  return undefined;
}

function extractCompany(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 10)) {
    const lower = line.toLowerCase();
    if (lower.startsWith("chez ")) return clean(line.slice(5));
    if (lower.startsWith("company:") || lower.startsWith("entreprise:") || lower.startsWith("employeur:")) {
      return clean(line.split(":")[1] ?? "");
    }
  }

  // Heuristic: a short capitalized line near the top that isn't the title.
  for (const line of lines.slice(1, 6)) {
    if (line.length < 60 && /^[A-Z][A-Za-z0-9&\s\-\.]+$/.test(line)) {
      return clean(line);
    }
  }

  return undefined;
}

function extractLocation(lines: string[]): string | undefined {
  const joined = lines.join(" ");
  const patterns = [
    /(?:location|lieu|emplacement|based in|situé à|localisation)\s*[:\-]?\s*([^,\.\n]{3,60})/i,
    /(?:télétravail|remote|hybride|sur site|on-site|bureau à)\s+(.{3,60})/i,
    /\b(Montréal|Québec|Toronto|Vancouver|Calgary|Ottawa|Edmonton|Mississauga|Winnipeg|Halifax|Remote|Hybride)\b/i,
  ];
  for (const p of patterns) {
    const m = joined.match(p);
    if (m) return clean(m[1] ?? m[0]);
  }

  // Look for "ville, province" patterns.
  const ville = joined.match(/\b([A-Z][a-zA-Z\-\s]+,\s*(QC|ON|BC|AB|MB|SK|NS|NB|NL|PE|Canada))\b/);
  if (ville) return clean(ville[1]);

  return undefined;
}

function extractWorkMode(lower: string): string | undefined {
  if (lower.includes("télétravail 100%") || lower.includes("fully remote") || lower.includes("100% remote")) return "remote";
  if (lower.includes("télétravail") || lower.includes("remote")) return "hybrid or remote";
  if (lower.includes("hybride") || lower.includes("hybrid")) return "hybrid";
  if (lower.includes("sur site") || lower.includes("on-site") || lower.includes("on site")) return "on-site";
  if (lower.includes("présentiel")) return "on-site";
  return undefined;
}

function extractSkills(text: string, _lines: string[], _kind: "required" | "nice" = "required"): string[] | undefined {
  // Match sections that list skills.
  const sectionHeaders = [
    /(?:compétences requises|exigences|requirements|required skills|what you bring|profil recherché|qualifications)\s*[:\-]?\s*([\s\S]{0,800})/i,
  ];

  for (const h of sectionHeaders) {
    const m = text.match(h);
    if (!m) continue;
    const raw = m[1];
    const list = splitSkillItems(raw)
      .map((s) => clean(s))
      .filter((s) => s.length > 2 && s.length < 120);
    if (list.length > 0) return list;
  }

  return undefined;
}

function extractSkillsFromSections(text: string, headers: string[]): string[] | undefined {
  const lower = text.toLowerCase();
  for (const header of headers) {
    const idx = lower.indexOf(header);
    if (idx < 0) continue;
    // Grab until next blank line or next obvious section header.
    const section = text.slice(idx, idx + 1500);
    const list = splitSkillItems(section)
      .map((s) => clean(s))
      .filter((s) => s.length > 2 && s.length < 120 && !s.toLowerCase().startsWith(header));
    if (list.length > 0) return list.slice(0, 20);
  }
  return undefined;
}

function splitSkillItems(raw: string): string[] {
  // Split on bullets, newlines, or common delimiters inside lines.
  const items: string[] = [];
  const chunks = raw.split(/\n|•|-|\*/);
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    if (SKILL_DELIMITERS.test(trimmed)) {
      for (const part of trimmed.split(SKILL_DELIMITERS)) {
        items.push(part);
      }
    } else {
      items.push(trimmed);
    }
  }
  return items;
}

function extractResponsibilities(text: string, lines: string[]): string[] | undefined {
  const sectionHeaders = [
    /(?:responsabilités|responsibilities|tâches|missions|what you.ll do|vos défis|role and responsibilities|fonctions)\s*[:\-]?\s*([\s\S]{0,1200})/i,
  ];

  for (const h of sectionHeaders) {
    const m = text.match(h);
    if (!m) continue;
    const list = m[1]
      .split(/\n|•|-|\*/)
      .map((s) => clean(s))
      .filter((s) => s.length > 10 && s.length < 250);
    if (list.length > 0) return list.slice(0, 12);
  }

  // Fallback: lines that start with action verbs.
  const actionVerbs = /^(développer|concevoir|gérer|analyser|collaborer|participer|assurer|créer|implémenter|superviser|maintien|support|lead|build|manage|develop|design|analyze|collaborate|ensure|create|implement|support|oversee)/i;
  const bullets = lines
    .filter((l) => actionVerbs.test(l) && l.length > 20 && l.length < 250)
    .slice(0, 10);
  if (bullets.length > 0) return bullets;

  return undefined;
}

function extractSalary(text: string): string | undefined {
  const patterns = [
    /(\$\s?\d{2,3}[\s,]*\d{3}\s*-\s*\$?\s?\d{2,3}[\s,]*\d{3}(?:\s*\/\s*(an|year|année|mois|month))?)/i,
    /(\d{2,3}[\s,]*\d{3}\s*\$\s*-\s*\d{2,3}[\s,]*\d{3}\s*\$)/i,
    /(salaire\s*[:\-]?\s*[^\n]{3,60})/i,
    /(\$\s?\d{2,3}[\s,]*\d{3}\s*\+?(?:\s*\/\s*(an|year|année|mois|month))?)/i,
    /(\d{2,3}[\s,]*\d{3}\s*\$\s*\+?\s*(?:par an|par mois|annuel|mensuel|yearly|monthly)?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return clean(m[1]).replace(/\s+/g, " ");
  }
  return undefined;
}

function extractSkillTokens(text: string): string[] {
  // A conservative list of technical/professional skills commonly found in Canadian tech/business offers.
  const tokens = [
    "typescript", "javascript", "python", "java", "c#", "go", "rust", "ruby", "php",
    "react", "next.js", "vue", "angular", "svelte", "node.js", "express", "nestjs",
    "django", "flask", "spring", "laravel",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "pulumi",
    "postgresql", "mysql", "mongodb", "redis", "sqlite", "prisma", "drizzle",
    "graphql", "rest", "api", "microservices", "kafka", "rabbitmq",
    "git", "github", "gitlab", "ci/cd", "github actions", "jenkins",
    "agile", "scrum", "kanban", "jira", "confluence",
    "sql", "nosql", "data analysis", "machine learning", "ai", "llm",
    "figma", "sketch", "adobe xd", "ui/ux", "design system",
    "salesforce", "hubspot", "crm", "erp", "sap",
    "excel", "powerpoint", "word", "power bi", "tableau",
    "project management", "product management", "stakeholder management",
    "communication", "leadership", "team management", "bilingual", "french", "english",
    "customer service", "support", "account management", "business development",
    "seo", "sem", "google analytics", "content marketing", "social media",
    "accounting", "bookkeeping", "quickbooks", "payroll",
    "recruitment", "hr", "talent acquisition", "onboarding",
  ];

  const lower = text.toLowerCase();
  const found = tokens.filter((t) => {
    const re = new RegExp(`\\b${t.replace(/[.+*?^$()|[\]{}]/g, "\\$&")}\\b`, "i");
    return re.test(lower);
  });

  return uniqueClean(found);
}

function detectLanguage(text: string): "fr" | "en" {
  const frenchMarkers = ["nous recherchons", "poste", "responsabilités", "compétences", "salaire", "télétravail", "expérience", "profil", "candidature", "lettre"];
  const englishMarkers = ["we are looking for", "position", "responsibilities", "skills", "salary", "remote", "experience", "profile", "application", "cover letter"];
  let fr = 0;
  let en = 0;
  const lower = text.toLowerCase();
  for (const m of frenchMarkers) if (lower.includes(m)) fr++;
  for (const m of englishMarkers) if (lower.includes(m)) en++;
  return fr >= en ? "fr" : "en";
}

function looksLikeCompany(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes("inc.") || lower.includes("ltée") || lower.includes("corp") || /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+(Inc|Ltd|LLC|Corp)$/i.test(line);
}

function clean(s: string): string {
  return s
    .replace(/^[^\wÀ-ÿ]+/g, "")
    .replace(/[^\wÀ-ÿ\s\-+#.\/()]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueClean(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
