import { Document, Packer, Paragraph, TextRun } from "docx";
import type { CvJson } from "./types.js";

export async function coverLetterToDocx(letter: string, cv: CvJson): Promise<Blob> {
  const children: Paragraph[] = [];
  const c = cv.contact ?? {};

  if (c.name) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: c.name, bold: true, size: 28, color: "0F4C5C" })],
      }),
    );
  }
  const contactParts = [c.email, c.phone, c.location].filter((x): x is string => Boolean(x));
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join(" | "), size: 20, color: "555555" })],
        spacing: { after: 300 },
      }),
    );
  }

  const paragraphs = letter.split("\n").filter((p) => p.trim());
  for (const p of paragraphs) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: p, size: 22 })],
        spacing: { after: 160 },
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080,
              bottom: 1080,
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
