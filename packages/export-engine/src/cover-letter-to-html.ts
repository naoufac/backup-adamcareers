import type { CvJson } from "./types.js";
import { esc } from "./escape-html.js";

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
