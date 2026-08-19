"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/site-nav";
import { api } from "@/lib/api";
import { CvEditor } from "@/components/cv-editor";
import { ExportBar } from "@/components/export-bar";
import { CvScorecard, type Scores } from "@/components/scorecard";
import { matchSkills, type MatchResult, type OfferParsed } from "@adamjobs/offer-engine";
import type { CvJson } from "@adamjobs/cv-engine";

interface Offer {
  id: string;
  raw: string;
  parsedJson: OfferParsed;
  companyResearch?: { name?: string; sector?: string; size?: string; mission?: string; values?: string[]; notes?: string };
}

interface AdaptResult {
  applicationId: string;
  variant: Record<string, unknown>;
  coverLetter: string;
  notes: string;
  changes: any[];
  scores: Scores;
  baseCv: Record<string, unknown>;
}

export default function OfferDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = new URL(window.location.href).pathname.split("/").pop() ?? "";
  const [offer, setOffer] = useState<Offer | null>(null);
  const [masterCv, setMasterCv] = useState<CvJson | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [adapt, setAdapt] = useState<AdaptResult | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!params) return;
    api<{ offer: Offer }>(`/api/offers/${params}`)
      .then((d) => setOffer(d.offer))
      .catch((e) => setErr(e.message));
    api<{ cv: CvJson | null }>("/api/cv/mine")
      .then((d) => setMasterCv(d.cv))
      .catch(() => setMasterCv(null));
  }, [params]);

  useEffect(() => {
    if (offer && masterCv) {
      setMatch(matchSkills(masterCv, offer.parsedJson));
    }
  }, [offer, masterCv]);

  if (loading || !offer) {
    return (
      <div className="min-h-screen bg-slate-50">
      <AppHeader />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 rounded bg-slate-200" />
            <div className="h-32 rounded-xl bg-slate-100" />
            <div className="h-64 rounded-xl bg-slate-100" />
          </div>
        </main>
      </div>
    );
  }

  const p = offer.parsedJson;

  const doAdapt = async () => {
    setBusy("adapt"); setErr("");
    try {
      const data = await api<AdaptResult>(`/api/offers/${offer.id}/adapt`, { method: "POST", json: {} });
      setAdapt(data);
      setCoverLetter(data.coverLetter);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy("");
    }
  };

  const finalize = async () => {
    if (!adapt) return;
    setBusy("finalize"); setErr("");
    try {
      await api(`/api/applications/${adapt.applicationId}/accept`, {
        method: "POST",
        json: { acceptedChangeIds: adapt.changes.map((c) => c.id), changes: adapt.changes, coverLetter },
      });
      router.push(`/app/applications/${adapt.applicationId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">{p.title ?? "Offre sans titre"}</h1>
          <p className="text-slate-600">{[p.company, p.location, p.workMode].filter(Boolean).join(" — ")}</p>
          {p.salary && <p className="mt-1 text-sm text-slate-500">{p.salary}</p>}
          {p.mustHaveSkills && p.mustHaveSkills.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Compétences requises</h3>
              <div className="flex flex-wrap gap-1.5">
                {p.mustHaveSkills.map((s, i) => {
                  const matched = match?.matchedMustHave.some((m) => m.skill.toLowerCase() === s.toLowerCase());
                  return (
                    <span key={i} className={`rounded-md px-2 py-0.5 text-xs font-medium ${matched ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {s}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {match && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-lg font-bold text-adam-700">{match.overallScore}</div>
                <div className="text-xs text-slate-500">Match global</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-lg font-bold text-slate-700">{match.mustHaveScore}%</div>
                <div className="text-xs text-slate-500">Requis</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-lg font-bold text-slate-500">{match.niceToHaveScore}%</div>
                <div className="text-xs text-slate-500">Atouts</div>
              </div>
            </div>
          )}
        </div>

        {!adapt && (
          <button onClick={doAdapt} disabled={busy === "adapt"} className="mb-6 w-full rounded-xl bg-adam-700 py-4 text-lg font-bold text-white shadow-sm hover:bg-adam-800 disabled:opacity-50">
            {busy === "adapt" ? "Adam adapte votre CV..." : "Adapter mon CV et ma lettre"}
          </button>
        )}

        {err && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

        {adapt && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <ExportBar
                cv={adapt.variant}
                coverLetter={coverLetter}
                fileName={((adapt.variant.contact as any)?.name?.toLowerCase().replace(/\s+/g, "-") as string) ?? "candidature-adamcareers"}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">CV d'origine</h2>
                <CvEditor cv={adapt.baseCv as any} readOnly />
              </div>
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-adam-700">CV adapté</h2>
                <CvEditor cv={adapt.variant as any} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">Lettre d'accompagnement</h2>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={14}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-800 outline-none focus:border-adam-700"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="flex gap-3">
                <button onClick={finalize} disabled={busy === "finalize"} className="flex-1 rounded-xl bg-adam-700 py-3 font-bold text-white hover:bg-adam-800 disabled:opacity-50">
                  {busy === "finalize" ? "Enregistrement..." : "Enregistrer cette candidature"}
                </button>
                <button onClick={() => router.push("/app")} className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50">
                  Retour
                </button>
              </div>
              <CvScorecard scores={adapt.scores} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
