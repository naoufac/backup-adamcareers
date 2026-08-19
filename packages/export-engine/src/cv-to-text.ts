import type { CvJson } from "./types.js";

export function cvToText(cv: CvJson): string {
  const lines: string[] = [];
  const c = cv.contact ?? {};
  const headerParts = [c.name, c.email, c.phone, c.location, c.linkedin].filter(
    (x): x is string => Boolean(x),
  );
  lines.push(headerParts.join(" | "));
  lines.push("");

  if (cv.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(cv.summary);
    lines.push("");
  }

  if (cv.coreCompetencies && cv.coreCompetencies.length > 0) {
    lines.push("CORE COMPETENCIES");
    lines.push(cv.coreCompetencies.join(", "));
    lines.push("");
  }

  if (cv.experience && cv.experience.length > 0) {
    lines.push("PROFESSIONAL EXPERIENCE");
    for (const e of cv.experience) {
      const dates = [e.startDate, e.endDate].filter(Boolean).join(" - ");
      lines.push(`${e.title ?? ""}${e.company ? ` | ${e.company}` : ""}${dates ? ` (${dates})` : ""}`);
      if (e.location) lines.push(e.location);
      for (const b of e.bullets ?? []) lines.push(`  - ${b}`);
      lines.push("");
    }
  }

  if (cv.education && cv.education.length > 0) {
    lines.push("EDUCATION");
    for (const ed of cv.education) {
      const degree = [ed.degree, ed.field].filter(Boolean).join(", ");
      const dates = [ed.startDate, ed.endDate].filter(Boolean).join(" - ");
      lines.push(`${degree}${ed.institution ? ` | ${ed.institution}` : ""}${dates ? ` (${dates})` : ""}`);
    }
    lines.push("");
  }

  if (cv.certifications && cv.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    for (const cert of cv.certifications) lines.push(`  - ${cert}`);
    lines.push("");
  }

  if (cv.languages && cv.languages.length > 0) {
    lines.push("LANGUAGES");
    lines.push(cv.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", "));
    lines.push("");
  }

  if (cv.volunteer && cv.volunteer.length > 0) {
    lines.push("VOLUNTEER EXPERIENCE");
    for (const v of cv.volunteer) lines.push(`  - ${v}`);
    lines.push("");
  }

  if (cv.awards && cv.awards.length > 0) {
    lines.push("AWARDS");
    for (const a of cv.awards) lines.push(`  - ${a}`);
  }

  return lines.join("\n").trim() + "\n";
}
