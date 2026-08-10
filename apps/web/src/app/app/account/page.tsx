"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import { api } from "@/lib/api";

export default function AccountPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setLocale((user.locale as "fr" | "en") ?? "fr");
    }
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setOk("");
    if (password && password !== confirm) { setErr("Les mots de passe ne correspondent pas."); return; }
    if (password && password.length < 8) { setErr("Le mot de passe doit faire au moins 8 caractères."); return; }
    setBusy(true);
    const json: Record<string, string> = { name, locale };
    if (password) json.password = password;
    try {
      await api("/api/me/profile", { method: "POST", json });
      await refresh();
      setOk("Compte mis à jour ✓");
      setPassword(""); setConfirm("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-10">
          <div className="animate-pulse space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-2/3 rounded bg-slate-100" />
          </div>
        </main>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold text-adam-700">Mon compte</h1>

        {err && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
        {ok && <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{ok}</p>}

        <form onSubmit={submit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" value={user.email} disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-adam-700" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Langue</label>
            <div className="flex gap-2">
              {(["fr", "en"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLocale(l)} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${locale === l ? "border-adam-700 bg-adam-50 text-adam-700" : "border-slate-300 text-slate-500"}`}>
                  {l === "fr" ? "Français" : "English"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-adam-700" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Laisser vide pour ne pas changer" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-adam-700" />
            {password && password.length < 8 && <p className="mt-1 text-xs text-red-600">Minimum 8 caractères.</p>}
            {password && confirm && password !== confirm && <p className="mt-1 text-xs text-red-600">Les mots de passe ne correspondent pas.</p>}
          </div>

          <button type="submit" disabled={busy || (password.length > 0 && (password.length < 8 || password !== confirm))} className="w-full rounded-lg bg-adam-700 py-2.5 font-semibold text-white hover:bg-adam-800 disabled:opacity-50">
            {busy ? "..." : "Enregistrer les modifications"}
          </button>
        </form>

        <div className="mt-8 rounded-xl border border-red-100 bg-red-50/50 p-6">
          <h2 className="text-sm font-semibold text-red-800">Zone de danger</h2>
          <p className="mt-1 text-sm text-red-600/80">Supprimer votre compte efface définitivement vos CV, offres et candidatures. Cette action est irréversible.</p>
          <button type="button" disabled className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50" title="À activer avec un second facteur de confirmation">
            Supprimer mon compte (contactez-nous)
          </button>
        </div>
      </main>
    </div>
  );
}
