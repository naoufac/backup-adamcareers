// Browser-side CV diff engine.
// Produces atomic, reviewable changes between a base CV and an adapted variant.

import type { CvJson, CvChange, DiffBlock } from "./types.js";

export type { CvChange };

export function diffCv(base: CvJson, variant: CvJson): CvChange[] {
  const changes: CvChange[] = [];

  // --- Summary ---
  if ((base.summary ?? "") !== (variant.summary ?? "")) {
    changes.push({
      id: "summary",
      kind: "summary_edited",
      section: "summary",
      oldValue: base.summary,
      newValue: variant.summary,
    });
  }

  // --- Core competencies ---
  const baseSkills = base.coreCompetencies ?? [];
  const varSkills = variant.coreCompetencies ?? [];
  const baseSet = new Set(baseSkills.map((s) => s.toLowerCase()));
  const varSet = new Set(varSkills.map((s) => s.toLowerCase()));

  for (const s of varSkills) {
    if (!baseSet.has(s.toLowerCase())) {
      changes.push({ id: `skill:${s}`, kind: "skill_added", section: "coreCompetencies", newValue: s });
    }
  }
  for (const s of baseSkills) {
    if (!varSet.has(s.toLowerCase())) {
      changes.push({ id: `skill:${s}`, kind: "skill_removed", section: "coreCompetencies", oldValue: s });
    }
  }

  // --- Experience ---
  const baseExp = base.experience ?? [];
  const varExp = variant.experience ?? [];
  const baseByKey = new Map<string, (typeof baseExp)[number]>();
  for (const e of baseExp) baseByKey.set(expKey(e), e);
  const varByKey = new Map<string, (typeof varExp)[number]>();
  for (const e of varExp) varByKey.set(expKey(e), e);

  for (const e of varExp) {
    if (!baseByKey.has(expKey(e))) {
      changes.push({
        id: `exp:${expKey(e)}`,
        kind: "experience_added",
        section: "experience",
        experienceKey: expKey(e),
        newValue: JSON.stringify(e),
      });
    }
  }
  for (const e of baseExp) {
    if (!varByKey.has(expKey(e))) {
      changes.push({
        id: `exp:${expKey(e)}`,
        kind: "experience_removed",
        section: "experience",
        experienceKey: expKey(e),
        oldValue: JSON.stringify(e),
      });
    }
  }

  // Diff bullets for matching experiences.
  for (const ve of varExp) {
    const be = baseByKey.get(expKey(ve));
    if (!be) continue;
    const key = expKey(ve);
    const baseBullets = be.bullets ?? [];
    const varBullets = ve.bullets ?? [];
    const baseNorm = baseBullets.map((b) => normalizeBullet(b));
    const varNorm = varBullets.map((b) => normalizeBullet(b));
    const baseMatched = new Set<number>();

    varBullets.forEach((vb, vi) => {
      const vbNorm = varNorm[vi];
      let matchIdx = -1;
      for (let bi = 0; bi < baseNorm.length; bi++) {
        if (baseMatched.has(bi)) continue;
        if (baseNorm[bi] === vbNorm) {
          matchIdx = bi;
          break;
        }
      }
      if (matchIdx >= 0) {
        baseMatched.add(matchIdx);
        if (matchIdx !== vi) {
          changes.push({
            id: `bullet:${key}:reorder:${vi}`,
            kind: "bullet_reorder",
            section: "experience",
            experienceKey: key,
            newValue: vb,
            oldIndex: matchIdx,
            newIndex: vi,
          });
        }
        return;
      }

      let bestSim = 0;
      let bestBase = -1;
      for (let bi = 0; bi < baseNorm.length; bi++) {
        if (baseMatched.has(bi)) continue;
        const sim = similarity(baseNorm[bi], vbNorm);
        if (sim > bestSim) {
          bestSim = sim;
          bestBase = bi;
        }
      }
      if (bestSim >= 0.5 && bestBase >= 0) {
        baseMatched.add(bestBase);
        changes.push({
          id: `bullet:${key}:edit:${vi}`,
          kind: "bullet_edited",
          section: "experience",
          experienceKey: key,
          oldValue: baseBullets[bestBase],
          newValue: vb,
        });
      } else {
        changes.push({
          id: `bullet:${key}:add:${vi}`,
          kind: "bullet_added",
          section: "experience",
          experienceKey: key,
          newValue: vb,
        });
      }
    });

    baseBullets.forEach((bb, bi) => {
      if (!baseMatched.has(bi)) {
        changes.push({
          id: `bullet:${key}:rm:${bi}`,
          kind: "bullet_removed",
          section: "experience",
          experienceKey: key,
          oldValue: bb,
        });
      }
    });
  }

  return changes;
}

export function applyChanges(base: CvJson, changes: CvChange[], acceptedIds: Set<string>): CvJson {
  const result: CvJson = structuredClone(base);
  const accepted = changes.filter((c) => acceptedIds.has(c.id));

  const summaryAccepted = accepted.find((c) => c.kind === "summary_edited");
  if (summaryAccepted?.newValue != null) result.summary = summaryAccepted.newValue;

  if (result.coreCompetencies || accepted.some((c) => c.section === "coreCompetencies")) {
    let skills = [...(base.coreCompetencies ?? [])];
    for (const c of accepted) {
      if (c.kind === "skill_added" && c.newValue) skills.push(c.newValue);
      if (c.kind === "skill_removed" && c.oldValue) {
        skills = skills.filter((s) => s.toLowerCase() !== c.oldValue!.toLowerCase());
      }
    }
    result.coreCompetencies = skills;
  }

  const expById = new Map<string, NonNullable<CvJson["experience"]>[number]>();
  for (const e of base.experience ?? []) expById.set(expKey(e), structuredClone(e));

  for (const c of accepted) {
    if (c.kind === "experience_removed" && c.experienceKey) expById.delete(c.experienceKey);
    if (c.kind === "experience_added" && c.experienceKey && c.newValue) {
      try {
        expById.set(c.experienceKey, JSON.parse(c.newValue));
      } catch {
        /* skip */
      }
    }
  }

  for (const c of accepted) {
    if (!c.experienceKey) continue;
    const exp = expById.get(c.experienceKey);
    if (!exp) continue;
    const bullets = exp.bullets ?? [];

    if (c.kind === "bullet_added" && c.newValue) bullets.push(c.newValue);
    if (c.kind === "bullet_removed" && c.oldValue) {
      const idx = bullets.findIndex((b) => b === c.oldValue);
      if (idx >= 0) bullets.splice(idx, 1);
    }
    if (c.kind === "bullet_edited" && c.oldValue && c.newValue) {
      const idx = bullets.findIndex((b) => b === c.oldValue);
      if (idx >= 0) bullets[idx] = c.newValue;
    }
    if (c.kind === "bullet_reorder" && c.oldIndex != null && c.newIndex != null) {
      if (c.oldIndex < bullets.length) {
        const [moved] = bullets.splice(c.oldIndex, 1);
        bullets.splice(c.newIndex, 0, moved);
      }
    }
    exp.bullets = bullets;
  }

  result.experience = [...expById.values()];
  return result;
}

export function toDiffBlocks(changes: CvChange[]): DiffBlock[] {
  return changes.map((c) => ({
    ...c,
    label: labelForChange(c),
  }));
}

function labelForChange(c: CvChange): string {
  switch (c.kind) {
    case "summary_edited": return "Professional summary rewritten";
    case "skill_added": return `Skill added: ${c.newValue ?? ""}`;
    case "skill_removed": return `Skill removed: ${c.oldValue ?? ""}`;
    case "experience_added": return "Experience added";
    case "experience_removed": return "Experience removed";
    case "bullet_added": return "New bullet";
    case "bullet_removed": return "Bullet removed";
    case "bullet_edited": return "Bullet rewritten";
    case "bullet_reorder": return "Bullet reordered";
    default: return c.kind;
  }
}

function expKey(e: { company?: string; title?: string }): string {
  return `${e.company ?? "?"}|${e.title ?? "?"}`;
}

function normalizeBullet(b: string): string {
  return b.toLowerCase().replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const wa = new Set(a.split(" "));
  const wb = new Set(b.split(" "));
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = wa.size + wb.size - inter;
  return union === 0 ? 0 : inter / union;
}
