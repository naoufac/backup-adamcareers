import type { CvJson } from "./types.js";

// LLMs return slightly different key names for the same concept. This maps the
// common variants onto the canonical CvJson shape so downstream code and the
// validator always see consistent structure.
export function normalizeCv(input: unknown): CvJson {
  const src = (input ?? {}) as Record<string, unknown>;
  const out: CvJson = {};

  // Contact: support both nested and root-level fields.
  const contactSrc = (src.contact ?? {}) as Record<string, unknown>;
  const contact: CvJson["contact"] = {
    name: str(contactSrc.name ?? src.name),
    email: str(contactSrc.email ?? src.email),
    phone: str(contactSrc.phone ?? src.phone),
    location: str(contactSrc.location ?? src.location),
    linkedin: str(contactSrc.linkedin ?? src.linkedin ?? src.linkedIn ?? src.link),
  };
  if (Object.values(contact).some((v) => v != null)) out.contact = contact;

  out.summary = str(src.summary ?? src.headline ?? src.profile ?? src.objective) ?? undefined;

  // Competencies
  const comps = arr(src.coreCompetencies ?? src.skills ?? src.competencies ?? src.keySkills);
  if (comps.length) out.coreCompetencies = comps.map((x) => str(x)).filter(Boolean) as string[];

  // Experience: accept many key names.
  const expSrc = arr(src.experience ?? src.work_experience ?? src.workExperience ?? src.workHistory ?? src.jobs);
  const experience: CvJson["experience"] = [];
  for (const e of expSrc) {
    const er = (e ?? {}) as Record<string, unknown>;
    experience.push({
      company: str(er.company ?? er.employer ?? er.organization),
      title: str(er.title ?? er.jobTitle ?? er.job_title ?? er.position ?? er.role),
      startDate: str(er.startDate ?? er.start_date ?? er.from),
      endDate: str(er.endDate ?? er.end_date ?? er.to),
      location: str(er.location),
      bullets: arr(er.bullets ?? er.bullet_points ?? er.bulletPoints ?? er.responsibilities ?? er.achievements)
        .map((b) => str(b))
        .filter(Boolean) as string[],
    });
  }
  if (experience.length) out.experience = experience;

  // Education
  const eduSrc = arr(src.education ?? src.education_history ?? src.educationHistory);
  const education: CvJson["education"] = [];
  for (const e of eduSrc) {
    const er = (e ?? {}) as Record<string, unknown>;
    education.push({
      institution: str(er.institution ?? er.school ?? er.university),
      degree: str(er.degree ?? er.diploma),
      field: str(er.field ?? er.major ?? er.fieldOfStudy),
      startDate: str(er.startDate ?? er.start_date),
      endDate: str(er.endDate ?? er.end_date ?? er.graduationYear ?? er.year),
    });
  }
  if (education.length) out.education = education;

  // Languages
  const langSrc = arr(src.languages);
  if (langSrc.length) {
    out.languages = langSrc
      .map((l) => {
        const lr = typeof l === "string" ? { name: l } : (l as Record<string, unknown>);
        return { name: str(lr.name) ?? "", level: str(lr.level ?? lr.proficiency) ?? "" };
      })
      .filter((l) => l.name);
  }

  const certs = arr(src.certifications ?? src.certificates);
  if (certs.length) out.certifications = certs.map((x) => str(x)).filter(Boolean) as string[];

  const vol = arr(src.volunteer ?? src.volunteerWork);
  if (vol.length) out.volunteer = vol.map((x) => str(x)).filter(Boolean) as string[];

  const awards = arr(src.awards ?? src.honors ?? src.honours);
  if (awards.length) out.awards = awards.map((x) => str(x)).filter(Boolean) as string[];

  return out;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length > 0 && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined" ? s : undefined;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
