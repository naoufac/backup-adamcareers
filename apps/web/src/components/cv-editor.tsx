"use client";

import { useState } from "react";

export interface CvData {
  contact?: { name?: string; email?: string; phone?: string; location?: string };
  summary?: string;
  coreCompetencies?: string[];
  experience?: {
    id?: string;
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    bullets?: string[];
  }[];
  education?: { id?: string; institution?: string; degree?: string; field?: string; startDate?: string; endDate?: string }[];
  languages?: { id?: string; name: string; level?: string }[];
  certifications?: string[];
}

export function CvEditor({
  cv,
  onChange,
  readOnly = false,
}: {
  cv: CvData;
  onChange?: (cv: CvData) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<CvData>(cv);

  const update = (next: CvData) => {
    setDraft(next);
    onChange?.(next);
  };

  const setContact = (patch: Partial<CvData["contact"]>) =>
    update({ ...draft, contact: { ...draft.contact, ...patch } });

  const setExp = (idx: number, patch: Partial<NonNullable<CvData["experience"]>[number]>) => {
    const exp = [...(draft.experience ?? [])];
    if (idx >= exp.length) return;
    exp[idx] = { ...exp[idx], ...patch };
    update({ ...draft, experience: exp });
  };

  const setEdu = (idx: number, patch: Partial<NonNullable<CvData["education"]>[number]>) => {
    const edu = [...(draft.education ?? [])];
    if (idx >= edu.length) return;
    edu[idx] = { ...edu[idx], ...patch };
    update({ ...draft, education: edu });
  };

  const setBullet = (expIdx: number, bulletIdx: number, value: string) => {
    const exp = draft.experience ?? [];
    const bullets = [...(exp[expIdx].bullets ?? [])];
    bullets[bulletIdx] = value;
    setExp(expIdx, { bullets });
  };

  const addBullet = (expIdx: number) => {
    const exp = draft.experience ?? [];
    const bullets = [...(exp[expIdx].bullets ?? []), ""];
    setExp(expIdx, { bullets });
  };

  const removeBullet = (expIdx: number, bulletIdx: number) => {
    const exp = draft.experience ?? [];
    const bullets = (exp[expIdx].bullets ?? []).filter((_, i) => i !== bulletIdx);
    setExp(expIdx, { bullets });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <EditableText
          value={draft.contact?.name ?? ""}
          placeholder="Votre nom"
          className="text-2xl font-bold text-slate-900"
          readOnly={readOnly}
          onChange={(v) => setContact({ name: v })}
        />
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
          <EditableText
            value={draft.contact?.email ?? ""}
            placeholder="email"
            readOnly={readOnly}
            onChange={(v) => setContact({ email: v })}
          />
          <EditableText
            value={draft.contact?.phone ?? ""}
            placeholder="téléphone"
            readOnly={readOnly}
            onChange={(v) => setContact({ phone: v })}
          />
          <EditableText
            value={draft.contact?.location ?? ""}
            placeholder="ville, province"
            readOnly={readOnly}
            onChange={(v) => setContact({ location: v })}
          />
        </div>
      </header>

      {draft.summary != null && (
        <section className="mb-6">
          <SectionTitle>Profil professionnel</SectionTitle>
          <EditableText
            value={draft.summary}
            multiline
            readOnly={readOnly}
            onChange={(v) => update({ ...draft, summary: v })}
          />
        </section>
      )}

      {draft.coreCompetencies && draft.coreCompetencies.length > 0 && (
        <section className="mb-6">
          <SectionTitle>Compétences clés</SectionTitle>
          <EditableText
            value={draft.coreCompetencies.join(", ")}
            readOnly={readOnly}
            onChange={(v) => update({ ...draft, coreCompetencies: v.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </section>
      )}

      {draft.experience && draft.experience.length > 0 && (
        <section className="mb-6">
          <SectionTitle>Expérience professionnelle</SectionTitle>
          <div className="space-y-5">
            {draft.experience.map((exp, i) => (
              <div key={exp.id ?? i} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-baseline justify-between">
                  <EditableText
                    value={exp.title ?? ""}
                    placeholder="Poste"
                    className="font-semibold text-slate-900"
                    readOnly={readOnly}
                    onChange={(v) => setExp(i, { title: v })}
                  />
                  <span className="text-xs text-slate-400">
                    {[exp.startDate, exp.endDate].filter(Boolean).join(" - ")}
                  </span>
                </div>
                <EditableText
                  value={exp.company ?? ""}
                  placeholder="Entreprise"
                  className="text-sm text-slate-600"
                  readOnly={readOnly}
                  onChange={(v) => setExp(i, { company: v })}
                />
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                  {(exp.bullets ?? []).map((b, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <EditableText
                        value={b}
                        multiline
                        placeholder="Réalisation"
                        readOnly={readOnly}
                        onChange={(v) => setBullet(i, j, v)}
                      />
                      {!readOnly && (
                        <button onClick={() => removeBullet(i, j)} className="text-xs text-red-500 hover:underline">✕</button>
                      )}
                    </li>
                  ))}
                </ul>
                {!readOnly && (
                  <button onClick={() => addBullet(i)} className="mt-2 text-xs font-medium text-adam-700 hover:underline">
                    + Ajouter une réalisation
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {draft.education && draft.education.length > 0 && (
        <section className="mb-6">
          <SectionTitle>Formation</SectionTitle>
          <div className="space-y-2">
            {draft.education.map((ed, i) => (
              <div key={ed.id ?? i} className="text-sm">
                <EditableText
                  value={`${ed.degree ?? ""}${ed.field ? `, ${ed.field}` : ""}${ed.institution ? ` — ${ed.institution}` : ""}`}
                  readOnly={readOnly}
                  onChange={(v) => setEdu(i, { degree: v })}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {draft.languages && draft.languages.length > 0 && (
        <section>
          <SectionTitle>Langues</SectionTitle>
          <EditableText
            value={draft.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ")}
            readOnly={readOnly}
            onChange={(v) => update({
              ...draft,
              languages: v.split(",").map((s) => {
                const m = s.trim().match(/^(.+?)\s*\((.+?)\)$/);
                return m ? { name: m[1].trim(), level: m[2].trim() } : { name: s.trim() };
              }).filter((l) => l.name),
            })}
          />
        </section>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 border-b border-slate-100 pb-1 text-xs font-bold uppercase tracking-wider text-adam-700">{children}</h3>;
}

function EditableText({
  value,
  onChange,
  placeholder,
  className = "",
  multiline = false,
  readOnly = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return <div className={`whitespace-pre-wrap text-sm ${className}`}>{value || <span className="text-slate-300 italic">{placeholder}</span>}</div>;
  }
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`w-full resize-y rounded border border-transparent px-1 py-0.5 text-sm text-slate-700 hover:border-slate-200 focus:border-adam focus:outline-none ${className}`}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`rounded border border-transparent px-1 py-0.5 text-sm text-slate-700 hover:border-slate-200 focus:border-adam focus:outline-none ${className}`}
    />
  );
}
