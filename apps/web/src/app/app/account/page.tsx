"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import { api } from "@/lib/api";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [password, setPassword] = useState("");
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
    setErr(""); setOk(""); setBusy(true);
    const json: Record<string, string> = { name, locale };
    if (password) json.password = password;
    try {
      await api("/api/me/profile", { method: "POST", json });
      setOk("Compte mis à jour ✓");
      setPassword("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-400">Chargement...</div>
      </main>
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
            {password && password.length < 8 && <p className="mt-1 text-xs text-red-600">Minimum 8 caractères.</p>}
          </div>

          <button type="submit" disabled={busy || (password.length > 0 && password.length < 8)} className="w-full rounded-lg bg-adam-700 py-2.5 font-semibold text-white hover:bg-adam-800 disabled:opacity-50">
            {busy ? "..." : "Enregistrer les modifications"}
          </button>
        </form>
      </main>
    </div>
  );
}
