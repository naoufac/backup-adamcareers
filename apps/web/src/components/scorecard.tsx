"use client";

import { useMemo } from "react";
import { validateCanadianCv, type Scorecard, type CvJson } from "@adamjobs/cv-engine";

export interface Scores {
  violations: { id: string; severity: "error" | "warning"; message: string }[];
  complianceScore: number;
  atsScore: number;
}

export function CvScorecard({ scores, cv }: { scores?: Scores; cv?: CvJson }) {
  const computed = useMemo<Scorecard>(() => {
    if (scores) return scores as Scorecard;
    return validateCanadianCv(cv ?? {});
  }, [scores, cv]);
  const errors = computed.violations.filter((v) => v.severity === "error");
  const warnings = computed.violations.filter((v) => v.severity === "warning");

  return (
    <aside className="sticky top-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Scores en temps reel
        </h3>
        <Gauge label="Conformite canadienne" value={computed.complianceScore} />
        <div className="mt-3">
          <Gauge label="Score ATS" value={computed.atsScore} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Points a ameliorer
        </h3>
        {computed.violations.length === 0 ? (
          <p className="text-sm text-green-600">CV conforme. Aucun point blocant.</p>
        ) : (
          <ul className="space-y-2">
            {errors.map((v) => (
              <li key={v.id} className="flex gap-2 text-sm">
                <span className="text-red-500">&#9679;</span>
                <span className="text-slate-700">{v.message}</span>
              </li>
            ))}
            {warnings.map((v) => (
              <li key={v.id} className="flex gap-2 text-sm">
                <span className="text-amber-500">&#9679;</span>
                <span className="text-slate-600">{v.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function Gauge({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
