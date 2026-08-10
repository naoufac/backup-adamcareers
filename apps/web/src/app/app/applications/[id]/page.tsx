"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import { api } from "@/lib/api";
import { ExportBar } from "@/components/export-bar";
import { CvEditor } from "@/components/cv-editor";

interface ApplicationDetail {
  id: string;
  status: string;
  coverLetter: string | null;
  cvVariantJson: any;
  offer: {
    id: string;
    parsedJson: {
      title?: string;
      company?: string;
      location?: string;
      workMode?: string;
    };
  };
  documents: { id: string; kind: string; format: string; url: string }[];
}

export default function ApplicationDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = new URL(window.location.href).pathname.split("/").pop() ?? "";
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!params) return;
    api<{ application: ApplicationDetail }>(`/api/applications/${params}`)
      .then((d) => setApp(d.application))
      .catch((e) => setErr(e instanceof Error ? e.message : "Erreur"));
  }, [params]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 rounded bg-slate-200" />
            <div className="h-32 rounded-xl bg-slate-100" />
          </div>
        </main>
      </div>
    );
  }

  const p = app?.offer?.parsedJson;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/app" className="hover:text-adam-700">Tableau de bord</Link>
          <span>/</span>
          <span className="text-slate-700">Candidature</span>
        </div>

        {err && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

        {app ? (
          <>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{p?.title ?? "Candidature"}</h1>
                  <p className="text-slate-600">{[p?.company, p?.location, p?.workMode].filter(Boolean).join(" — ")}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${app.status === "finalized" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {app.status === "finalized" ? "Finalisée" : "Brouillon"}
                </span>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <ExportBar applicationId={app.id} cv={app.cvVariantJson} fileName={app.id} />
            </div>

            {app.coverLetter && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">Lettre d'accompagnement</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{app.coverLetter}</p>
              </div>
            )}

            {app.cvVariantJson && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">CV adapté</h2>
                <CvEditor cv={app.cvVariantJson} readOnly />
              </div>
            )}
          </>
        ) : (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 rounded bg-slate-200" />
            <div className="h-32 rounded-xl bg-slate-100" />
          </div>
        )}
      </main>
    </div>
  );
}
