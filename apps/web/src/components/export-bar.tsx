"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";

interface ExportBarProps {
  applicationId?: string;
  cv?: unknown;
  coverLetter?: string;
  fileName?: string;
  onExport?: (kind: "cv" | "cover-letter", format: "txt" | "pdf" | "docx") => void;
}

export function ExportBar({ applicationId, cv, coverLetter, fileName, onExport }: ExportBarProps) {
  const [busy, setBusy] = useState<null | { kind: string; format: string }>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState("");
  const [paid, setPaid] = useState(false);

  const triggerDownload = (blob: Blob, name: string, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast("Téléchargement lancé ✓");
    setTimeout(() => setToast(""), 2500);
  };

  const doExport = async (kind: "cv" | "cover-letter", format: "txt" | "pdf" | "docx") => {
    if (busy) return;
    setBusy({ kind, format });
    try {
      const payload: Record<string, unknown> = {};
      if (applicationId) payload.applicationId = applicationId;
      if (cv) payload.cv = cv;
      if (coverLetter) payload.coverLetter = coverLetter;

      const res = await fetch(`${API_BASE}/api/export/${kind}/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (res.status === 402) {
        setShowPaywall(true);
        setBusy(null);
        return;
      }

      if (!res.ok) throw new Error(`Export failed: ${res.status}`);

      const blob = await res.blob();
      const base = fileName ?? (kind === "cv" ? "cv-adamcareers" : "lettre-adamcareers");
      triggerDownload(blob, base, format);
      onExport?.(kind, format);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setBusy(null);
    }
  };

  const pay = async () => {
    setPaying(true);
    try {
      await fetch(`${API_BASE}/api/billing/pay-export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setPaid(true);
      setShowPaywall(false);
      setToast("Export débloqué ✓");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Erreur de paiement");
    } finally {
      setPaying(false);
    }
  };

  const isBusy = (kind: string, format: string) => busy?.kind === kind && busy?.format === format;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">Télécharger :</span>

        <button
          onClick={() => doExport("cv", "pdf")}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-adam-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-adam-800 disabled:opacity-50"
        >
          {isBusy("cv", "pdf") ? "..." : "CV PDF"}
        </button>
        <button
          onClick={() => doExport("cv", "docx")}
          disabled={!!busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          DOCX
        </button>
        <button
          onClick={() => doExport("cv", "txt")}
          disabled={!!busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          TXT
        </button>

        {coverLetter && (
          <>
            <span className="mx-1 hidden h-4 w-px bg-slate-300 sm:inline-block" />
            <button
              onClick={() => doExport("cover-letter", "pdf")}
              disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-adam-700/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-adam-800 disabled:opacity-50"
            >
              {isBusy("cover-letter", "pdf") ? "..." : "Lettre PDF"}
            </button>
            <button
              onClick={() => doExport("cover-letter", "docx")}
              disabled={!!busy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              DOCX
            </button>
            <button
              onClick={() => doExport("cover-letter", "txt")}
              disabled={!!busy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              TXT
            </button>
          </>
        )}
      </div>

      {toast && (
        <p className={`mt-2 text-sm ${toast.includes("Erreur") ? "text-red-600" : "text-green-600"}`}>
          {toast}
        </p>
      )}

      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Vous avez utilisé vos 4 exports gratuits</h3>
            <p className="mt-2 text-sm text-slate-600">
              Débloquez les exports illimités pour 1$ USD par export. Paiement sécurisé via Stripe (intégration en cours).
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold">Total :</span> 1,00 $ US
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowPaywall(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={pay}
                disabled={paying}
                className="flex-1 rounded-lg bg-adam-700 py-2 text-sm font-semibold text-white transition hover:bg-adam-800 disabled:opacity-50"
              >
                {paying ? "..." : "Payer 1$ et exporter"}
              </button>
            </div>
            {paid && <p className="mt-2 text-xs text-green-600">Paiement validé. Vous pouvez maintenant exporter.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
