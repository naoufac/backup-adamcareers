"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { useAppConfig } from "@/lib/app-config";
import { Button, Card } from "@adamjobs/ui-kit";
import {
  cvToText,
  coverLetterToText,
  cvToDocx,
  coverLetterToDocx,
  cvToPdf,
  coverLetterToPdf,
  type CvJson,
} from "@adamjobs/export-engine";

interface ExportBarProps {
  cv?: CvJson;
  coverLetter?: string;
  fileName?: string;
  onExport?: (kind: "cv" | "cover-letter", format: "txt" | "pdf" | "docx") => void;
}

export function ExportBar({ cv, coverLetter, fileName, onExport }: ExportBarProps) {
  const [busy, setBusy] = useState<null | { kind: string; format: string }>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState("");
  const [paid, setPaid] = useState(false);
  const config = useAppConfig();

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

  const checkEntitlement = async (): Promise<{ allowed: boolean; paid: boolean }> => {
    const res = await fetch(`${API_BASE}/api/export/allow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (res.status === 402) return { allowed: false, paid: false };
    if (!res.ok) throw new Error(`Entitlement check failed: ${res.status}`);
    return res.json() as Promise<{ allowed: boolean; paid: boolean }>;
  };

  const generateBlob = async (
    kind: "cv" | "cover-letter",
    format: "txt" | "pdf" | "docx",
  ): Promise<Blob> => {
    const effectiveCv = cv ?? {};
    const effectiveLetter = coverLetter ?? "";

    if (kind === "cv") {
      if (format === "txt") return new Blob([cvToText(effectiveCv)], { type: "text/plain;charset=utf-8" });
      if (format === "docx") return cvToDocx(effectiveCv);
      return cvToPdf(effectiveCv);
    }

    // cover-letter
    if (format === "txt") return new Blob([coverLetterToText(effectiveLetter)], { type: "text/plain;charset=utf-8" });
    if (format === "docx") return coverLetterToDocx(effectiveLetter, effectiveCv);
    return coverLetterToPdf(effectiveLetter, effectiveCv);
  };

  const doExport = async (kind: "cv" | "cover-letter", format: "txt" | "pdf" | "docx") => {
    if (busy) return;
    setBusy({ kind, format });
    try {
      const gate = await checkEntitlement();
      if (!gate.allowed) {
        setShowPaywall(true);
        setBusy(null);
        return;
      }

      const blob = await generateBlob(kind, format);
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

        <Button
          onClick={() => doExport("cv", "pdf")}
          disabled={!!busy}
          variant="primary"
        >
          {isBusy("cv", "pdf") ? "..." : "CV PDF"}
        </Button>
        <Button
          onClick={() => doExport("cv", "docx")}
          disabled={!!busy}
          variant="secondary"
        >
          DOCX
        </Button>
        <Button
          onClick={() => doExport("cv", "txt")}
          disabled={!!busy}
          variant="secondary"
        >
          TXT
        </Button>

        {coverLetter && (
          <>
            <span className="mx-1 hidden h-4 w-px bg-slate-300 sm:inline-block" />
            <Button
              onClick={() => doExport("cover-letter", "pdf")}
              disabled={!!busy}
              variant="primary"
            >
              {isBusy("cover-letter", "pdf") ? "..." : "Lettre PDF"}
            </Button>
            <Button
              onClick={() => doExport("cover-letter", "docx")}
              disabled={!!busy}
              variant="secondary"
            >
              DOCX
            </Button>
            <Button
              onClick={() => doExport("cover-letter", "txt")}
              disabled={!!busy}
              variant="secondary"
            >
              TXT
            </Button>
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
          <Card className="w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Vous avez utilisé vos 4 exports gratuits</h3>
            <p className="mt-2 text-sm text-slate-600">
              Débloquez les exports illimités. Paiement sécurisé via Stripe.
            </p>
            {config && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">Total :</span> {(config.exportPrice / 100).toFixed(2)} {config.currency.toUpperCase()}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3">
              <Button onClick={() => setShowPaywall(false)} variant="secondary">
                Annuler
              </Button>
              <Button onClick={pay} disabled={paying} variant="primary">
                {paying ? "..." : config?.stripePublishableKey ? "Payer avec Stripe" : "Débloquer (mode test)"}
              </Button>
            </div>
            {!config?.stripePublishableKey && (
              <p className="mt-3 text-xs text-amber-600">
                Stripe n'est pas encore configuré. Le déblocage est simulé en développement.
              </p>
            )}
            {paid && <p className="mt-2 text-xs text-green-600">Paiement validé. Vous pouvez maintenant exporter.</p>}
          </Card>
        </div>
      )}
    </div>
  );
}
