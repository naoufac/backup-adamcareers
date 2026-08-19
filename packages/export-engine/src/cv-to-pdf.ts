import { jsPDF } from "jspdf";
import type { CvJson } from "./types.js";

const PAGE_WIDTH = 215.9; // Letter width in mm
const PAGE_HEIGHT = 279.4; // Letter height in mm
const MARGIN_X = 19.05; // 0.75 inch
const MARGIN_Y = 12.7; // 0.5 inch
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_Y * 2;
const LINE_HEIGHT = 5.2;
const SECTION_GAP = 4.5;
const TEAL: [number, number, number] = [15, 76, 92];
const DARK: [number, number, number] = [20, 20, 20];
const GRAY_40: [number, number, number] = [40, 40, 40];
const GRAY_80: [number, number, number] = [80, 80, 80];
const GRAY_100: [number, number, number] = [100, 100, 100];
const LIGHT_GRAY: [number, number, number] = [200, 200, 200];

interface Cursor {
  x: number;
  y: number;
}

export function cvToPdf(cv: CvJson): Blob {
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  let cursor: Cursor = { x: MARGIN_X, y: MARGIN_Y };

  const c = cv.contact ?? {};
  const headerParts = [c.name, c.email, c.phone, c.location, c.linkedin].filter(
    (x): x is string => Boolean(x),
  );

  // Header
  if (headerParts.length > 0) {
    if (c.name) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...TEAL);
      const nameWidth = doc.getTextWidth(c.name);
      doc.text(c.name, (PAGE_WIDTH - nameWidth) / 2, cursor.y);
      cursor.y += 7;
    }

    const contactLine = headerParts.slice(1).join("  |  ");
    if (contactLine) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_80);
      const contactWidth = doc.getTextWidth(contactLine);
      doc.text(contactLine, (PAGE_WIDTH - contactWidth) / 2, cursor.y);
      cursor.y += 5;
    }

    // Header divider
    cursor.y += 2;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_X, cursor.y, MARGIN_X + CONTENT_WIDTH, cursor.y);
    cursor.y += 6;
  }

  // Professional Summary
  if (cv.summary) {
    cursor = sectionTitle(doc, "Professional Summary", cursor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_40);
    cursor = wrapText(doc, cv.summary, cursor, 10, LINE_HEIGHT);
    cursor.y += SECTION_GAP;
  }

  // Core Competencies
  if (cv.coreCompetencies && cv.coreCompetencies.length > 0) {
    cursor = sectionTitle(doc, "Core Competencies", cursor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_40);
    cursor = wrapText(doc, cv.coreCompetencies.join(", "), cursor, 10, LINE_HEIGHT);
    cursor.y += SECTION_GAP;
  }

  // Professional Experience
  if (cv.experience && cv.experience.length > 0) {
    cursor = sectionTitle(doc, "Professional Experience", cursor);
    for (const e of cv.experience) {
      cursor = ensureSpace(doc, cursor, 12);

      // Title and company on one line, dates right-aligned
      const titleParts: string[] = [];
      if (e.title) titleParts.push(e.title);
      if (e.company) titleParts.push(e.company);
      const leftText = titleParts.join(" — ");
      const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      if (dates) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...GRAY_80);
        const datesWidth = doc.getTextWidth(dates);
        doc.text(dates, MARGIN_X + CONTENT_WIDTH - datesWidth, cursor.y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...DARK);
      }
      doc.text(leftText, MARGIN_X, cursor.y);
      cursor.y += LINE_HEIGHT;

      if (e.location) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_100);
        doc.text(e.location, MARGIN_X, cursor.y);
        cursor.y += LINE_HEIGHT - 0.5;
      }

      for (const b of e.bullets ?? []) {
        cursor = ensureSpace(doc, cursor, 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...GRAY_40);
        cursor = wrapText(doc, `▸ ${b}`, cursor, 10, LINE_HEIGHT, 4);
      }
      cursor.y += 3;
    }
    cursor.y += SECTION_GAP;
  }

  // Education
  if (cv.education && cv.education.length > 0) {
    cursor = sectionTitle(doc, "Education", cursor);
    for (const ed of cv.education) {
      cursor = ensureSpace(doc, cursor, 8);
      const degree = [ed.degree, ed.field].filter(Boolean).join(", ");
      const dates = [ed.startDate, ed.endDate].filter(Boolean).join(" – ");
      const rightText = dates ? ` (${dates})` : "";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      let line = degree;
      if (ed.institution) line += ` — ${ed.institution}`;

      if (rightText) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...GRAY_80);
        const rightWidth = doc.getTextWidth(rightText);
        doc.text(rightText, MARGIN_X + CONTENT_WIDTH - rightWidth, cursor.y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...DARK);
      }
      doc.text(line, MARGIN_X, cursor.y);
      cursor.y += LINE_HEIGHT;
    }
    cursor.y += SECTION_GAP;
  }

  // Certifications
  if (cv.certifications && cv.certifications.length > 0) {
    cursor = sectionTitle(doc, "Certifications", cursor);
    for (const cert of cv.certifications) {
      cursor = ensureSpace(doc, cursor, 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_40);
      cursor = wrapText(doc, `▸ ${cert}`, cursor, 10, LINE_HEIGHT, 4);
    }
    cursor.y += SECTION_GAP;
  }

  // Languages
  if (cv.languages && cv.languages.length > 0) {
    cursor = sectionTitle(doc, "Languages", cursor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_40);
    const langText = cv.languages
      .map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`)
      .join(" · ");
    cursor = wrapText(doc, langText, cursor, 10, LINE_HEIGHT);
    cursor.y += SECTION_GAP;
  }

  // Volunteer
  if (cv.volunteer && cv.volunteer.length > 0) {
    cursor = sectionTitle(doc, "Volunteer Experience", cursor);
    for (const v of cv.volunteer) {
      cursor = ensureSpace(doc, cursor, 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_40);
      cursor = wrapText(doc, `▸ ${v}`, cursor, 10, LINE_HEIGHT, 4);
    }
    cursor.y += SECTION_GAP;
  }

  // Awards
  if (cv.awards && cv.awards.length > 0) {
    cursor = sectionTitle(doc, "Awards", cursor);
    for (const a of cv.awards) {
      cursor = ensureSpace(doc, cursor, 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_40);
      cursor = wrapText(doc, `▸ ${a}`, cursor, 10, LINE_HEIGHT, 4);
    }
  }

  return doc.output("blob");
}

function sectionTitle(doc: jsPDF, text: string, cursor: Cursor): Cursor {
  cursor = ensureSpace(doc, cursor, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(text.toUpperCase(), MARGIN_X, cursor.y);
  cursor.y += 1.5;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, cursor.y, MARGIN_X + CONTENT_WIDTH, cursor.y);
  cursor.y += 4;
  return cursor;
}

function ensureSpace(doc: jsPDF, cursor: Cursor, minHeight: number): Cursor {
  if (cursor.y + minHeight > MARGIN_Y + CONTENT_HEIGHT) {
    doc.addPage();
    return { x: MARGIN_X, y: MARGIN_Y };
  }
  return cursor;
}

function wrapText(
  doc: jsPDF,
  text: string,
  cursor: Cursor,
  fontSize: number,
  lineHeight: number,
  indent = 0,
): Cursor {
  const effectiveWidth = CONTENT_WIDTH - indent;
  const words = text.split(" ");
  let line = "";
  doc.setFontSize(fontSize);

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (doc.getTextWidth(testLine) > effectiveWidth && line) {
      doc.text(line, MARGIN_X + indent, cursor.y);
      cursor.y += lineHeight;
      cursor = ensureSpace(doc, cursor, lineHeight);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    doc.text(line, MARGIN_X + indent, cursor.y);
    cursor.y += lineHeight;
  }

  return cursor;
}
