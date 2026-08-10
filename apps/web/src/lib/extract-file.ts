"use client";

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (isPdf) return extractPdf(file);
  if (isDocx) return extractDocx(file);
  return new TextDecoder().decode(await file.arrayBuffer());
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      "Aucun texte extrait du PDF. Il s'agit peut-etre d'un CV scanne (image). Convertissez-le en texte ou utilisez .txt.",
    );
  }
  return trimmed;
}

async function extractDocx(file: File): Promise<string> {
  // mammoth's browser build has no dedicated .d.ts; cast to any for the import.
  const mod = (await import(
    /* webpackChunkName: "mammoth" */ "mammoth/mammoth.browser.js"
  )) as typeof import("mammoth");
  const buf = await file.arrayBuffer();
  const result = await mod.extractRawText({ arrayBuffer: buf });
  const trimmed = result.value.trim();
  if (!trimmed) {
    throw new Error("Aucun texte extrait du fichier .docx.");
  }
  return trimmed;
}
