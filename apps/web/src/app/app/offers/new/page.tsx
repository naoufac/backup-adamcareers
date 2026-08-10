"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/site-nav";
import { api } from "@/lib/api";

export default function NewOfferPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-slate-200" /><div className="h-64 rounded-xl bg-slate-100" /></div>
      </main>
    </div>
  );
  if (!user) { router.push("/auth"); return null; }

  const submit = async () => {
    if (text.trim().length < 50) { setErr("Collez au moins 50 caractères de l'offre."); return; }
    setErr(""); setBusy(true);
    try {
      const data = await api<{ offer: { id: string } }>("/api/offers", { method: "POST", json: { text } });
      router.push(`/app/offers/${data.offer.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-1 text-2xl font-bold text-adam-700">Adapter à une offre</h1>
        <p className="mb-8 text-sm text-slate-500">
          Collez le texte de l'offre. Adam adapte votre CV et votre lettre d'accompagnement.
        </p>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-slate-700">Texte de l'offre</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder="Titre du poste, entreprise, compétences requises, responsabilités, localisation..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-adam-700"
          />
          {err && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>}
          <button
            onClick={submit}
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-adam-700 py-2.5 font-semibold text-white hover:bg-adam-800 disabled:opacity-50"
          >
            {busy ? "Analyse en cours..." : "Analyser et adapter"}
          </button>
        </div>
      </main>
    </div>
  );
}
