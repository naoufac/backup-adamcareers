"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/site-nav";
import { api } from "@/lib/api";
import { extractFileText } from "@/lib/extract-file";
import { CvEditor } from "@/components/cv-editor";

interface ParseResult {
  cv: any;
  writingStyle: { tone?: string; voice?: string; language?: string };
}

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [fileMsg, setFileMsg] = useState("");

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-slate-200" /><div className="h-64 rounded-xl bg-slate-100" /></div>
      </main>
    </div>
  );
  if (!user) { router.push("/auth"); return null; }

  const onFile = async (file: File) => {
    setErr(""); setFileMsg("");
    try {
      const name = file.name.toLowerCase();
      const label = name.endsWith(".pdf") ? "PDF" : name.endsWith(".docx") ? "DOCX" : "texte";
      setFileMsg(`Extraction ${label} en cours...`);
      const extracted = await extractFileText(file);
      setText(extracted);
      setFileMsg(`${label} importé: ${extracted.length} caractères extraits.`);
    } catch (e) {
      setFileMsg("");
      setErr(e instanceof Error ? e.message : "Impossible de lire ce fichier.");
    }
  };

  const parse = async () => {
    if (text.trim().length < 50) { setErr("Collez au moins 50 caractères de CV."); return; }
    setErr(""); setBusy(true);
    try {
      const data = await api<ParseResult>("/api/onboarding/parse-cv", { method: "POST", json: { text } });
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de parsing");
    } finally {
      setBusy(false);
    }
  };

  const saveAndContinue = async () => {
    if (!result) return;
    setSaving(true); setErr("");
    try {
      await api("/api/cv/mine", { method: "PUT", json: { cv: result.cv } });
      router.push("/app?uploaded=1");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-bold text-adam-700">Importer mon CV</h1>
        <p className="mb-8 text-sm text-slate-500">Adam analyse votre CV et extrait la structure. Vous pouvez le corriger avant de l'enregistrer.</p>

        {!result ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-slate-700">Fichier PDF, DOCX, TXT, MD ou collez le texte</label>
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="mb-3 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-adam-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-adam-700 hover:file:bg-adam-100"
            />
            {fileMsg && <p className="mb-2 text-xs text-slate-500">{fileMsg}</p>}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Collez ici le contenu de votre CV..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-adam-700"
            />
            {err && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>}
            <button
              onClick={parse}
              disabled={busy}
              className="mt-3 rounded-lg bg-adam-700 px-6 py-2.5 font-semibold text-white hover:bg-adam-800 disabled:opacity-50"
            >
              {busy ? "Analyse en cours..." : "Analyser mon CV"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h2 className="font-semibold text-green-800">CV analysé ✓</h2>
              <p className="text-sm text-green-700">Style détecté: {result.writingStyle.tone ?? "professionnel"}, {result.writingStyle.language === "fr" ? "français" : "anglais"}. Vérifiez et corrigez avant d'enregistrer.</p>
            </div>
            <CvEditor cv={result.cv} onChange={(cv) => setResult({ ...result, cv })} />
            {err && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={saveAndContinue}
                disabled={saving}
                className="flex-1 rounded-lg bg-adam-700 py-2.5 font-semibold text-white hover:bg-adam-800 disabled:opacity-50"
              >
                {saving ? "..." : "Enregistrer mon CV"}
              </button>
              <button
                onClick={() => setResult(null)}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Recommencer
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
