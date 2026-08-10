"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/site-nav";
import { api } from "@/lib/api";

interface Usage {
  freeExportsUsed: number;
  freeExportsTotal: number;
  paid: boolean;
}

interface CvData {
  contact?: { name?: string; email?: string; phone?: string; location?: string };
  summary?: string;
  coreCompetencies?: string[];
  experience?: { title?: string; company?: string; startDate?: string; endDate?: string; bullets?: string[] }[];
  education?: { institution?: string; degree?: string; field?: string }[];
  languages?: { name: string; level?: string }[];
}

interface OfferSummary {
  id: string;
  parsedJson?: { title?: string; company?: string; location?: string; workMode?: string };
  createdAt: string;
}

interface AppSummary {
  id: string;
  offerParsed?: { title?: string; company?: string };
  status: string;
  createdAt: string;
}

function AppHomeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [cv, setCv] = useState<CvData | null>(null);
  const [offers, setOffers] = useState<OfferSummary[]>([]);
  const [applications, setApplications] = useState<AppSummary[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api<Usage>("/api/me/usage"),
      api<{ cv: CvData | null }>("/api/cv/mine"),
      api<{ offers: OfferSummary[] }>("/api/offers"),
      api<{ applications: AppSummary[] }>("/api/applications"),
    ]).then((results) => {
      if (results[0].status === "fulfilled") setUsage(results[0].value);
      if (results[1].status === "fulfilled") setCv(results[1].value.cv);
      if (results[2].status === "fulfilled") setOffers(results[2].value.offers ?? []);
      if (results[3].status === "fulfilled") setApplications(results[3].value.applications ?? []);
    }).catch((e) => setErr(e.message));
  }, [user]);



  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-slate-400">Chargement...</div>
      </main>
    );
  }
  if (!user) return null;

  const remaining = usage ? Math.max(0, usage.freeExportsTotal - usage.freeExportsUsed) : 4;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-adam-700">Bonjour{user.name ? `, ${user.name}` : ""} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </header>

        {usage && (
          <div className="mb-8 flex items-center justify-between rounded-xl border border-adam-200 bg-adam-50/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-adam-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {usage.paid ? "Exports illimités ✓" : `${remaining} export${remaining !== 1 ? "s" : ""} gratuit${remaining !== 1 ? "s" : ""} restant${remaining !== 1 ? "s" : ""}`}
                </p>
                {!usage.paid && (
                  <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-adam-100">
                    <div className="h-full rounded-full bg-adam-500 transition-all" style={{ width: `${(remaining / usage.freeExportsTotal) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
            {!usage.paid && remaining === 0 && <span className="rounded-lg bg-adam-accent/10 px-3 py-1 text-xs font-semibold text-adam-accent">$1/export ensuite</span>}
          </div>
        )}

        {searchParams.get("uploaded") && !err && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            CV enregistré. Vous pouvez maintenant <Link href="/app/offers/new" className="font-semibold underline">adapter votre CV à une offre</Link>.
          </div>
        )}

        {err && <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

        {!cv ? (
          <div className="rounded-2xl border-2 border-adam-700 bg-adam-50/30 p-8 text-center">
            <h2 className="text-xl font-bold text-adam-700">Commencez par votre CV</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">Adam a besoin de votre CV pour adapter vos candidatures aux offres canadiennes.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/app/builder" className="rounded-lg bg-adam-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-adam-800">Créer mon CV avec Adam</Link>
              <Link href="/app/upload" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Importer mon CV</Link>
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Votre CV</h2>
                <p className="text-sm text-slate-600">{cv.contact?.name ?? user.name ?? ""} · {cv.contact?.location ?? "Non renseigné"}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {cv.experience?.length ?? 0} expérience{(cv.experience?.length ?? 0) > 1 ? "s" : ""} · {cv.coreCompetencies?.length ?? 0} compétences · {cv.education?.length ?? 0} formation{(cv.education?.length ?? 0) > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/app/builder" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Modifier</Link>
                <Link href="/app/offers/new" className="rounded-lg bg-adam-700 px-4 py-2 text-sm font-semibold text-white hover:bg-adam-800">Adapter à une offre</Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Contact</h3>
                <p>{[cv.contact?.name, cv.contact?.email, cv.contact?.phone, cv.contact?.location].filter(Boolean).join(" · ") || "Non renseigné"}</p>
              </div>
              {cv.summary && (
                <div className="sm:col-span-2">
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Résumé</h3>
                  <p className="line-clamp-3">{cv.summary}</p>
                </div>
              )}
              {cv.coreCompetencies && cv.coreCompetencies.length > 0 && (
                <div className="sm:col-span-2">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Top compétences</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {cv.coreCompetencies.slice(0, 5).map((skill, i) => (
                      <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {cv.experience && cv.experience.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Expérience récente</h3>
                  <p className="font-medium text-slate-800">{cv.experience[0].title}</p>
                  <p>{cv.experience[0].company}</p>
                  <p className="text-xs text-slate-500">{[cv.experience[0].startDate, cv.experience[0].endDate].filter(Boolean).join(" — ")}</p>
                </div>
              )}
              {cv.education && cv.education.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Formation récente</h3>
                  <p className="font-medium text-slate-800">{cv.education[0].degree}</p>
                  <p>{cv.education[0].institution}</p>
                  <p className="text-xs text-slate-500">{cv.education[0].field}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Offres récentes</h2>
              <Link href="/app/offers/new" className="text-sm font-medium text-adam-700 hover:underline">+ Nouvelle offre</Link>
            </div>
            {offers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">Aucune offre encore. Collez une offre pour adapter votre CV.</p>
                <Link href="/app/offers/new" className="mt-3 inline-block rounded-lg bg-adam-700 px-4 py-2 text-sm font-semibold text-white hover:bg-adam-800">Coller une offre</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.slice(0, 5).map((o) => (
                  <Link key={o.id} href={`/app/offers/${o.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-adam-300 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{o.parsedJson?.title ?? "Offre"}</h3>
                        <p className="text-sm text-slate-500">{[o.parsedJson?.company, o.parsedJson?.location].filter(Boolean).join(" — ")}</p>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Candidatures</h2>
              <span className="text-xs text-slate-400">{applications.length}</span>
            </div>
            {applications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">Aucune candidature finalisée. Elles apparaîtront après avoir adapté votre CV.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 5).map((a) => (
                  <Link key={a.id} href={`/app/applications/${a.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-adam-300 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{a.offerParsed?.title ?? "Candidature"}</h3>
                        <p className="text-sm text-slate-500">{a.offerParsed?.company}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${a.status === "finalized" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {a.status === "finalized" ? "Finalisée" : "Brouillon"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AppHome() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="animate-pulse text-slate-400">Chargement...</div>
        </main>
      </div>
    }>
      <AppHomeContent />
    </Suspense>
  );
}
