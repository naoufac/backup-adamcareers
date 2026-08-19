import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseOffer } from "../parse-offer.js";
import { matchSkills } from "../match-skills.js";
import { diffCv, applyChanges } from "../highlight-diff.js";
import type { CvJson } from "../types.js";

const sampleOffer = `
Développeur Full Stack — SaaS en croissance

Nous recherchons un développeur Full Stack pour rejoindre notre équipe à Montréal.

Responsabilités:
- Concevoir et maintenir des applications web modernes
- Collaborer avec l'équipe produit et les designers
- Déployer des microservices sur AWS

Exigences:
- TypeScript, React, Node.js
- PostgreSQL, Docker
- Expérience avec AWS

Atouts:
- GraphQL
- Expérience en startup

Salaire: 90 000 $ - 110 000 $ par an
Mode: hybride
`;

const sampleCv: CvJson = {
  contact: { name: "Alice Example", email: "alice@example.com" },
  summary: "Full stack developer with 5 years building SaaS products.",
  coreCompetencies: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"],
  experience: [
    {
      title: "Senior Developer",
      company: "TechCorp",
      startDate: "2020",
      endDate: "2024",
      bullets: [
        "Built scalable web apps with React and Node.js",
        "Managed PostgreSQL databases and Docker containers",
      ],
    },
  ],
};

describe("parseOffer", () => {
  it("extracts title, company, location, salary and skills", () => {
    const parsed = parseOffer(sampleOffer);
    assert.equal(parsed.title, "Développeur Full Stack");
    assert.equal(parsed.location, "Montréal");
    assert.ok(parsed.salary);
    assert.equal(parsed.language, "fr");
    assert.ok(parsed.mustHaveSkills?.some((s) => s.toLowerCase().includes("typescript") || s.toLowerCase().includes("react") || s.toLowerCase().includes("node")), "mustHaveSkills should contain TS/React/Node");
    assert.ok(parsed.niceToHaveSkills?.some((s) => s.toLowerCase().includes("graphql") || s.toLowerCase().includes("startup")), "niceToHaveSkills should contain GraphQL/startup");
    assert.ok(parsed.responsibilities?.length && parsed.responsibilities.length > 0, "responsibilities should not be empty");
  });
});

describe("matchSkills", () => {
  it("reports high match when CV covers must-have skills", () => {
    const parsed = parseOffer(sampleOffer);
    const result = matchSkills(sampleCv, parsed);
    assert.ok(result.mustHaveScore >= 40, `mustHaveScore was ${result.mustHaveScore}`);
    assert.ok(result.matchedMustHave.some((m) => m.skill.toLowerCase().includes("typescript") || m.skill.toLowerCase().includes("react") || m.skill.toLowerCase().includes("node")), "should match a core skill");
    assert.equal(typeof result.overallScore, "number");
  });
});

describe("diffCv", () => {
  it("detects skill and summary changes", () => {
    const variant: CvJson = {
      ...sampleCv,
      summary: "Full stack developer with 6 years building SaaS and cloud products.",
      coreCompetencies: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS"],
    };
    const changes = diffCv(sampleCv, variant);
    assert.ok(changes.some((c) => c.kind === "summary_edited"), "should detect summary edit");
    assert.ok(changes.some((c) => c.kind === "skill_added" && c.newValue === "AWS"), "should detect AWS skill add");
    const applied = applyChanges(sampleCv, changes, new Set(changes.map((c) => c.id)));
    assert.equal(applied.summary, variant.summary);
    assert.ok(applied.coreCompetencies?.includes("AWS"));
  });
});
