import assert from "node:assert";
import test from "node:test";
import { cvToText, cvToDocx } from "../index.js";
import type { CvJson } from "../types.js";

const sample: CvJson = {
  contact: {
    name: "Marie Tremblay",
    email: "marie@example.com",
    phone: "514-555-0100",
    location: "Montréal, QC",
  },
  summary: "Ingénieure logiciel avec 6 ans d'expérience en développement web.",
  coreCompetencies: ["React", "Node.js", "TypeScript", "PostgreSQL"],
  experience: [
    {
      title: "Développeuse senior",
      company: "Acme Inc.",
      startDate: "2021-01",
      endDate: "Présent",
      location: "Montréal",
      bullets: [
        "Conception et maintenance d'une plateforme SaaS utilisée par 10 000 clients.",
        "Mentorat de trois développeurs juniors.",
      ],
    },
  ],
  education: [
    {
      degree: "B.Eng.",
      field: "Génie logiciel",
      institution: "École Polytechnique",
      startDate: "2014",
      endDate: "2018",
    },
  ],
  languages: [{ name: "Français", level: "Natif" }, { name: "Anglais", level: "Courant" }],
};

test("cvToText contains candidate name and a bullet", () => {
  const text = cvToText(sample);
  assert.ok(text.includes("Marie Tremblay"), "name missing");
  assert.ok(text.includes("plateforme SaaS"), "bullet missing");
});

test("cvToDocx returns a Blob", async () => {
  const blob = await cvToDocx(sample);
  assert.ok(blob instanceof Blob || (blob as Blob).size > 0, "expected Blob-like object");
});
