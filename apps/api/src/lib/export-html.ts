import type { CvJson } from "../db/schema.js";

// Renders a CvJson into a clean, professional HTML template for PDF export.
// Canadian format: Letter size (8.5x11in), ATS-safe, no graphics.
export function cvToHtml(cv: CvJson): string {
  const c = cv.contact ?? {};
  const headerParts = [c.name, c.email, c.phone, c.location, c.linkedin].filter(
    (x): x is string => Boolean(x),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @page { size: Letter; margin: 0.5in 0.75in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #1a1a1a;
  }
  .header {
    text-align: center;
    border-bottom: 2px solid #2c7488;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .header h1 {
    font-size: 20pt;
    font-weight: 700;
    color: #0f4c5c;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .header .contact {
    font-size: 10pt;
    color: #555;
  }
  .header .contact span {
    margin: 0 6px;
  }
  .section { margin-bottom: 14px; }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #0f4c5c;
    border-bottom: 1px solid #ccc;
    padding-bottom: 3px;
    margin-bottom: 8px;
  }
  .summary { font-size: 10.5pt; color: #333; }
  .competencies {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .competency {
    font-size: 10pt;
    background: #f0f7f8;
    border: 1px solid #d9ebee;
    border-radius: 3px;
    padding: 2px 8px;
    color: #1d5d70;
  }
  .experience-entry { margin-bottom: 12px; }
  .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
  }
  .exp-title {
    font-size: 11pt;
    font-weight: 700;
    color: #1a1a1a;
  }
  .exp-company {
    font-size: 10.5pt;
    font-weight: 600;
    color: #2c7488;
  }
  .exp-dates {
    font-size: 9.5pt;
    color: #666;
    font-style: italic;
  }
  .exp-location {
    font-size: 9.5pt;
    color: #888;
    margin-bottom: 4px;
  }
  .exp-bullets {
    list-style: none;
    padding-left: 0;
  }
  .exp-bullets li {
    font-size: 10.5pt;
    padding-left: 14px;
    position: relative;
    margin-bottom: 3px;
    color: #333;
  }
  .exp-bullets li::before {
    content: "▸";
    position: absolute;
    left: 0;
    color: #2c7488;
  }
  .edu-entry {
    font-size: 10.5pt;
    margin-bottom: 4px;
  }
  .edu-degree { font-weight: 600; }
  .edu-inst { color: #555; }
  .cert-list, .volunteer-list, .awards-list {
    list-style: none;
    padding-left: 0;
  }
  .cert-list li, .volunteer-list li, .awards-list li {
    font-size: 10.5pt;
    padding-left: 14px;
    position: relative;
    margin-bottom: 3px;
  }
  .cert-list li::before, .volunteer-list li::before, .awards-list li::before {
    content: "▸";
    position: absolute;
    left: 0;
    color: #2c7488;
  }
  .languages {
    font-size: 10.5pt;
    color: #333;
  }
</style>
</head>
<body>
${headerParts.length > 0 ? `<div class="header">
  ${c.name ? `<h1>${esc(c.name)}</h1>` : ""}
  <div class="contact">${headerParts.slice(1).map((h, i) => `<span>${esc(h)}</span>${i < headerParts.length - 2 ? '<span style="color:#ccc">|</span>' : ''}`).join("")}</div>
</div>` : ""}

${cv.summary ? `<div class="section">
  <div class="section-title">Professional Summary</div>
  <div class="summary">${esc(cv.summary)}</div>
</div>` : ""}

${cv.coreCompetencies && cv.coreCompetencies.length > 0 ? `<div class="section">
  <div class="section-title">Core Competencies</div>
  <div class="competencies">${cv.coreCompetencies.map(s => `<span class="competency">${esc(s)}</span>`).join("")}</div>
</div>` : ""}

${cv.experience && cv.experience.length > 0 ? `<div class="section">
  <div class="section-title">Professional Experience</div>
  ${cv.experience.map(e => `<div class="experience-entry">
    <div class="exp-header">
      <div>
        ${e.title ? `<span class="exp-title">${esc(e.title)}</span>` : ""}
        ${e.company ? `<span class="exp-company">${esc(e.company)}</span>` : ""}
      </div>
      ${[e.startDate, e.endDate].filter(Boolean).join(" – ") ? `<span class="exp-dates">${esc([e.startDate, e.endDate].filter(Boolean).join(" – "))}</span>` : ""}
    </div>
    ${e.location ? `<div class="exp-location">${esc(e.location)}</div>` : ""}
    ${e.bullets && e.bullets.length > 0 ? `<ul class="exp-bullets">${e.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
  </div>`).join("")}
</div>` : ""}

${cv.education && cv.education.length > 0 ? `<div class="section">
  <div class="section-title">Education</div>
  ${cv.education.map(ed => `<div class="edu-entry">
    <span class="edu-degree">${esc([ed.degree, ed.field].filter(Boolean).join(", "))}</span>
    ${ed.institution ? `<span class="edu-inst"> — ${esc(ed.institution)}</span>` : ""}
    ${(ed.startDate || ed.endDate) ? ` <span class="exp-dates">(${esc([ed.startDate, ed.endDate].filter(Boolean).join(" – "))})</span>` : ""}
  </div>`).join("")}
</div>` : ""}

${cv.certifications && cv.certifications.length > 0 ? `<div class="section">
  <div class="section-title">Certifications</div>
  <ul class="cert-list">${cv.certifications.map(cert => `<li>${esc(cert)}</li>`).join("")}</ul>
</div>` : ""}

${cv.languages && cv.languages.length > 0 ? `<div class="section">
  <div class="section-title">Languages</div>
  <div class="languages">${cv.languages.map(l => `${esc(l.name)}${l.level ? ` (${esc(l.level)})` : ""}`).join(" · ")}</div>
</div>` : ""}

${cv.volunteer && cv.volunteer.length > 0 ? `<div class="section">
  <div class="section-title">Volunteer Experience</div>
  <ul class="volunteer-list">${cv.volunteer.map(v => `<li>${esc(v)}</li>`).join("")}</ul>
</div>` : ""}

${cv.awards && cv.awards.length > 0 ? `<div class="section">
  <div class="section-title">Awards</div>
  <ul class="awards-list">${cv.awards.map(a => `<li>${esc(a)}</li>`).join("")}</ul>
</div>` : ""}

</body>
</html>`;
}

export function coverLetterToHtml(letter: string, cv: CvJson): string {
  const c = cv.contact ?? {};
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page { size: Letter; margin: 0.75in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
  }
  .header { margin-bottom: 20px; }
  .name { font-size: 16pt; font-weight: 700; color: #0f4c5c; }
  .contact { font-size: 10pt; color: #555; margin-top: 2px; }
  .date { font-size: 10.5pt; margin: 20px 0; color: #333; }
  .body p { margin-bottom: 12px; }
  .closing { margin-top: 24px; }
  .signature { margin-top: 30px; }
</style>
</head>
<body>
<div class="header">
  ${c.name ? `<div class="name">${esc(c.name)}</div>` : ""}
  <div class="contact">
    ${[c.email, c.phone, c.location].filter(Boolean).map(s => `<span>${esc(s!)}</span>`).join(" | ")}
  </div>
</div>
<div class="body">
${esc(letter).split("\n").map(p => `<p>${p || "&nbsp;"}</p>`).join("")}
</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
