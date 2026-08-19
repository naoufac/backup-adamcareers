import { jsPDF } from "jspdf";
import type { CvJson } from "./types.js";

const PAGE_WIDTH = 215.9;
const PAGE_HEIGHT = 279.4;
const MARGIN_X = 19.05;
const MARGIN_Y = 19.05;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_Y * 2;
const LINE_HEIGHT = 6.5;
const TEAL: [number, number, number] = [15, 76, 92];
const GRAY_80: [number, number, number] = [80, 80, 80];
const DARK: [number, number, number] = [20, 20, 20];

interface Cursor {
  x: number;
  y: number;
}

export function coverLetterToPdf(letter: string, cv: CvJson): Blob {
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  let cursor: Cursor = { x: MARGIN_X, y: MARGIN_Y };
  const c = cv.contact ?? {};

  // Header
  if (c.name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...TEAL);
    doc.text(c.name, MARGIN_X, cursor.y);
    cursor.y += 7;
  }

  const contactParts = [c.email, c.phone, c.location].filter((x): x is string => Boolean(x));
  if (contactParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_80);
    doc.text(contactParts.join(" | "), MARGIN_X, cursor.y);
    cursor.y += 12;
  } else {
    cursor.y += 5;
  }

  // Body paragraphs
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);

  for (const rawParagraph of letter.split("\n")) {
    const paragraph = rawParagraph.trim();
    if (!paragraph) {
      cursor.y += LINE_HEIGHT;
      continue;
    }

    cursor = ensureSpace(doc, cursor, LINE_HEIGHT);

    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (doc.getTextWidth(testLine) > CONTENT_WIDTH && line) {
        doc.text(line, MARGIN_X, cursor.y);
        cursor.y += LINE_HEIGHT;
        cursor = ensureSpace(doc, cursor, LINE_HEIGHT);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      doc.text(line, MARGIN_X, cursor.y);
      cursor.y += LINE_HEIGHT;
    }
  }

  return doc.output("blob");
}

function ensureSpace(doc: jsPDF, cursor: Cursor, minHeight: number): Cursor {
  if (cursor.y + minHeight > MARGIN_Y + CONTENT_HEIGHT) {
    doc.addPage();
    return { x: MARGIN_X, y: MARGIN_Y };
  }
  return cursor;
}
