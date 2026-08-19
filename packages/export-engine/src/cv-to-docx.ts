import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import type { CvJson } from "./types.js";

export async function cvToDocx(cv: CvJson): Promise<Blob> {
  const children: Paragraph[] = [];
  const c = cv.contact ?? {};

  if (c.name) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: c.name, bold: true, size: 32, color: "0F4C5C" })],
      }),
    );
  }
  const contactParts = [c.email, c.phone, c.location, c.linkedin].filter(
    (x): x is string => Boolean(x),
  );
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: contactParts.join(" | "), size: 20, color: "555555" })],
        spacing: { after: 200 },
      }),
    );
  }

  if (cv.summary) {
    children.push(sectionTitle("Professional Summary"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.summary, size: 21 })],
        spacing: { after: 200 },
      }),
    );
  }

  if (cv.coreCompetencies && cv.coreCompetencies.length > 0) {
    children.push(sectionTitle("Core Competencies"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.coreCompetencies.join(", "), size: 21 })],
        spacing: { after: 200 },
      }),
    );
  }

  if (cv.experience && cv.experience.length > 0) {
    children.push(sectionTitle("Professional Experience"));
    for (const e of cv.experience) {
      const titleParts: TextRun[] = [];
      if (e.title) titleParts.push(new TextRun({ text: e.title, bold: true, size: 22 }));
      if (e.company) {
        titleParts.push(new TextRun({ text: ` — ${e.company}`, bold: true, size: 22, color: "2C7488" }));
      }
      children.push(new Paragraph({ children: titleParts }));

      const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
      if (dates) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: dates, italics: true, size: 19, color: "666666" })],
          }),
        );
      }
      if (e.location) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: e.location, size: 19, color: "888888" })],
          }),
        );
      }
      for (const b of e.bullets ?? []) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `▸ ${b}`, size: 21 })],
            spacing: { after: 40 },
          }),
        );
      }
      children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
    }
  }

  if (cv.education && cv.education.length > 0) {
    children.push(sectionTitle("Education"));
    for (const ed of cv.education) {
      const parts: TextRun[] = [];
      const degree = [ed.degree, ed.field].filter(Boolean).join(", ");
      if (degree) parts.push(new TextRun({ text: degree, bold: true, size: 21 }));
      if (ed.institution) parts.push(new TextRun({ text: ` — ${ed.institution}`, size: 21, color: "555555" }));
      children.push(new Paragraph({ children: parts, spacing: { after: 60 } }));
    }
    children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
  }

  if (cv.certifications && cv.certifications.length > 0) {
    children.push(sectionTitle("Certifications"));
    for (const cert of cv.certifications) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `▸ ${cert}`, size: 21 })],
          spacing: { after: 40 },
        }),
      );
    }
    children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
  }

  if (cv.languages && cv.languages.length > 0) {
    children.push(sectionTitle("Languages"));
    const langText = cv.languages
      .map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`)
      .join(" · ");
    children.push(
      new Paragraph({
        children: [new TextRun({ text: langText, size: 21 })],
        spacing: { after: 200 },
      }),
    );
  }

  if (cv.volunteer && cv.volunteer.length > 0) {
    children.push(sectionTitle("Volunteer Experience"));
    for (const v of cv.volunteer) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `▸ ${v}`, size: 21 })],
          spacing: { after: 40 },
        }),
      );
    }
    children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
  }

  if (cv.awards && cv.awards.length > 0) {
    children.push(sectionTitle("Awards"));
    for (const a of cv.awards) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `▸ ${a}`, size: 21 })],
          spacing: { after: 40 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 1080,
              right: 1080,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 22, color: "0F4C5C", allCaps: true })],
    border: {
      bottom: { color: "CCCCCC", space: 1, style: "single" as const, size: 6 },
    },
    spacing: { after: 120 },
  });
}
