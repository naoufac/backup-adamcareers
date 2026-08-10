"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Logo } from "@/components/logo";

export default function AuthPage() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { email, password, name: name || undefined };
      await api(path, { method: "POST", json: payload });
      await refresh();
      router.push("/app");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-adam-50 to-white px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-adam-700/5">
          <h1 className="mb-1 text-2xl font-bold text-slate-900">
            {mode === "login" ? "Bon retour 👋" : "Créer votre compte"}
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Votre candidature canadienne, adaptée en 2 minutes.
          </p>

          <div className="mb-6 flex gap-2 rounded-lg bg-slate-100 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  mode === m ? "bg-white text-adam-700 shadow-sm" : "text-slate-500"
                }`}
              >
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nom (optionnel)</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-adam focus:ring-1 focus:ring-adam/30"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-adam focus:ring-1 focus:ring-adam/30"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</label>
              <input
                type="password"
                required
                minLength={mode === "register" ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-adam focus:ring-1 focus:ring-adam/30"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              {mode === "register" && <p className="mt-1 text-xs text-slate-400">8 caractères minimum</p>}
            </div>

            {err && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-adam-700 py-2.5 font-semibold text-white transition hover:bg-adam-800 disabled:opacity-50"
            >
              {busy ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Aucune carte de crédit requise. 4 exports gratuits.
          </p>
        </div>
      </div>
    </main>
  );
}
