import { describe, it } from "node:test";
import assert from "node:assert";
import { normalizeCv, validateCanadianCv } from "../index.js";

const sample = {
  contact: {
    name: "Alice Tremblay",
    email: "alice@example.com",
    phone: "+1 514 000 0000",
    location: "Montréal, QC",
  },
  summary: "Results-driven software engineer with 6 years building scalable web platforms.",
  coreCompetencies: ["TypeScript", "Node.js", "React", "PostgreSQL", "AWS", "CI/CD"],
  experience: [
    {
      title: "Senior Software Engineer",
      company: "Example Inc",
      startDate: "2021",
      endDate: "Present",
      location: "Toronto, ON",
      bullets: [
        "Led migration of legacy API serving 2M daily requests to Node.js, reducing latency by 40%.",
        "Built CI/CD pipeline used by 15 engineers.",
      ],
    },
  ],
  education: [
    { institution: "Université de Montréal", degree: "B.Eng.", field: "Software Engineering" },
  ],
  languages: [{ name: "French", level: "Native" }, { name: "English", level: "Fluent" }],
};

describe("cv-engine smoke", () => {
  it("normalizes a canonical CV", () => {
    const cv = normalizeCv(sample);
    assert.strictEqual(cv.contact?.name, "Alice Tremblay");
    assert.strictEqual(cv.experience?.length, 1);
    assert.strictEqual(cv.education?.length, 1);
  });

  it("scores the sample CV above 0", () => {
    const cv = normalizeCv(sample);
    const scores = validateCanadianCv(cv);
    assert.ok(scores.complianceScore > 0, "complianceScore should be > 0");
    assert.ok(scores.atsScore > 0, "atsScore should be > 0");
  });

  it("detects missing contact and experience as errors", () => {
    const scores = validateCanadianCv({ contact: {}, experience: [] });
    const errors = scores.violations.filter((v) => v.severity === "error");
    assert.ok(errors.length >= 2, "should report contact and experience errors");
  });
});
