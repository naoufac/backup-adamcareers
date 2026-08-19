// Browser-side skill matcher.
// Compares a CV against an offer and returns a coverage score with evidence.

import type { CvJson, OfferParsed, MatchResult } from "./types.js";

export function matchSkills(cv: CvJson, offer: OfferParsed): MatchResult {
  const must = normalizeSkills(offer.mustHaveSkills ?? []);
  const nice = normalizeSkills(offer.niceToHaveSkills ?? []);

  const corpus = buildCorpus(cv);
  const corpusTerms = new Set(corpus.split(/\s+/));

  const matchedMust = must
    .map((skill) => ({ skill, evidence: findEvidence(skill, cv, corpus) }))
    .filter((m) => m.evidence);
  const matchedNice = nice
    .map((skill) => ({ skill, evidence: findEvidence(skill, cv, corpus) }))
    .filter((m) => m.evidence);

  const missingMust = must.filter((s) => !matchedMust.some((m) => normalize(s) === normalize(m.skill)));
  const missingNice = nice.filter((s) => !matchedNice.some((m) => normalize(s) === normalize(m.skill)));

  const mustScore = must.length === 0 ? 100 : Math.round((matchedMust.length / must.length) * 100);
  const niceScore = nice.length === 0 ? 100 : Math.round((matchedNice.length / nice.length) * 100);
  const overall = Math.round(mustScore * 0.6 + niceScore * 0.4);

  const suggestions = rankSuggestions([...missingMust, ...missingNice], corpusTerms);

  return {
    mustHaveScore: mustScore,
    niceToHaveScore: niceScore,
    overallScore: overall,
    matchedMustHave: matchedMust,
    matchedNiceToHave: matchedNice,
    missingMustHave: missingMust,
    missingNiceToHave: missingNice,
    suggestions,
  };
}

function findEvidence(skill: string, cv: CvJson, corpus: string): string | undefined {
  const variants = skillVariants(skill);
  for (const v of variants) {
    // Direct hit in core competencies.
    if (cv.coreCompetencies?.some((c) => normalize(c).includes(v))) {
      return `Compétence clé: ${skill}`;
    }
  }

  // Hit in a bullet.
  for (const exp of cv.experience ?? []) {
    for (const bullet of exp.bullets ?? []) {
      const nb = normalize(bullet);
      if (variants.some((v) => nb.includes(v))) {
        return `${exp.title ?? "Expérience"}: ${bullet.slice(0, 90)}${bullet.length > 90 ? "..." : ""}`;
      }
    }
  }

  // Hit in summary.
  if (cv.summary && variants.some((v) => normalize(cv.summary!).includes(v))) {
    return `Profil: ${cv.summary.slice(0, 90)}${cv.summary.length > 90 ? "..." : ""}`;
  }

  // Hit anywhere else.
  if (variants.some((v) => corpus.includes(v))) {
    return `Mentionné dans le CV`;
  }

  return undefined;
}

function buildCorpus(cv: CvJson): string {
  const parts: string[] = [];
  if (cv.summary) parts.push(cv.summary);
  parts.push(...(cv.coreCompetencies ?? []));
  for (const e of cv.experience ?? []) {
    if (e.title) parts.push(e.title);
    if (e.company) parts.push(e.company);
    parts.push(...(e.bullets ?? []));
  }
  for (const ed of cv.education ?? []) {
    if (ed.degree) parts.push(ed.degree);
    if (ed.field) parts.push(ed.field);
    if (ed.institution) parts.push(ed.institution);
  }
  parts.push(...(cv.certifications ?? []));
  parts.push(...(cv.volunteer ?? []));
  parts.push(...(cv.awards ?? []));
  return normalize(parts.join(" "));
}

function skillVariants(skill: string): string[] {
  const base = normalize(skill);
  const variants = new Set<string>([base]);

  // Common aliases.
  if (base === "typescript") variants.add("type script");
  if (base === "javascript") variants.add("java script");
  if (base === "react") variants.add("reactjs");
  if (base === "node.js" || base === "nodejs") { variants.add("node"); variants.add("nodejs"); }
  if (base.includes(".js")) variants.add(base.replace(/\.js/g, ""));

  return [...variants];
}

function normalizeSkills(skills: string[]): string[] {
  return [...new Set(skills.map(normalize))].filter(Boolean);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rankSuggestions(missing: string[], _corpusTerms: Set<string>): string[] {
  // For now, rank by simple length priority: shorter, more concrete skills first.
  return [...new Set(missing)]
    .sort((a, b) => a.length - b.length)
    .slice(0, 10);
}
