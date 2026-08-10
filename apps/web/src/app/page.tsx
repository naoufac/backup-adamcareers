"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { MarketingNav } from "@/components/site-nav";
import { Logo } from "@/components/logo";

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) window.location.href = "/app";
  }, [loading, user]);

  const [demoOn, setDemoOn] = useState(false);

  const baseCv = {
    name: "Ayoub El Amrani",
    location: "Montréal, QC",
    email: "ayoub@example.com",
    summary: "Analyste de données avec 3 ans d'expérience. Spécialisé en visualisation, automatisation des rapports et analyse comportementale.",
    skills: "Python, SQL, Power BI, Tableau, Machine Learning, A/B testing",
    title: "Analyste de données",
    company: "TechMaroc",
    bullets: [
      "Conception de tableaux de bord Power BI, réduction du temps de reporting de 40%",
      "Analyse des comportements clients avec Python et SQL pour améliorer la rétention",
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      <header className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-adam-50/50 via-transparent to-white" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-adam-200 bg-adam-50 px-4 py-1.5 text-sm font-medium text-adam-600">
              <span className="flex h-2 w-2 rounded-full bg-green-500" />
              Propulsé par l'IA
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Votre candidature canadienne,
              <br />
              <span className="gradient-text">adaptée en 2 minutes.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Adam adapte votre CV et votre lettre d'accompagnement à chaque offre d'emploi. Score ATS en temps réel, format canadien, bilingue FR/EN.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth" className="group flex items-center gap-2 rounded-xl bg-adam-700 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-adam-700/20 transition hover:bg-adam-800 hover:shadow-xl">
                Créer mon CV canadien
                <span className="transition group-hover:translate-x-1">&rarr;</span>
              </Link>
              <a href="#demo" className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition hover:border-adam-300 hover:text-adam-700">
                Voir la démo
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-400">Aucune carte de crédit requise. Compte gratuit en 30 secondes.</p>
          </div>

          <div className="mt-16 mx-auto max-w-4xl animate-fade-up">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-adam-700/10">
              <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-slate-400">adamcareers.com/app</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                <div className="col-span-1 md:col-span-2 space-y-3 p-6">
                  <div className="h-5 w-48 rounded bg-slate-200" />
                  <div className="flex gap-2">
                    <div className="h-3 w-24 rounded bg-slate-100" />
                    <div className="h-3 w-20 rounded bg-slate-100" />
                    <div className="h-3 w-16 rounded bg-slate-100" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-2.5 w-full rounded bg-adam-50" />
                    <div className="h-2.5 w-5/6 rounded bg-adam-50" />
                    <div className="h-2.5 w-full rounded bg-green-50" />
                    <div className="h-2.5 w-4/5 rounded bg-adam-50" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-7 w-20 rounded-lg bg-adam-50" />
                    <div className="h-7 w-20 rounded-lg bg-adam-50" />
                    <div className="h-7 w-20 rounded-lg bg-adam-50" />
                  </div>
                </div>
                <div className="border-t md:border-t-0 md:border-l border-slate-100 p-6">
                  <div className="mb-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Conformité</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-green-600">92</span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-full w-[92%] rounded-full bg-green-500" /></div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Score ATS</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-adam-500">85</span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-full w-[85%] rounded-full bg-adam-400" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-y border-slate-100 bg-adam-800 py-8">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {[
            { n: "2 min", l: "Pour adapter un CV" },
            { n: "100%", l: "Format canadien" },
            { n: "FR/EN", l: "Bilingue" },
            { n: "ATS", l: "Score en temps réel" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-2xl font-bold text-white">{s.n}</div>
              <div className="mt-1 text-xs text-adam-200">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-slate-900">De l'offre à la candidature, en 3 étapes</h2>
            <p className="mt-3 text-slate-600">Adam fait le travail difficile. Vous gardez le contrôle.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { num: "01", title: "Importez ou créez votre CV", desc: "Téléchargez votre CV actuel, ou laissez Adam le construire à partir de quelques questions." },
              { num: "02", title: "Collez une offre d'emploi", desc: "Adam analyse l'offre, recherche l'entreprise, et adapte votre CV et votre lettre." },
              { num: "03", title: "Téléchargez et postulez", desc: "Exportez en PDF, DOCX ou TXT. Adam apprend de vos choix pour des adaptations encore meilleures." },
            ].map((step) => (
              <div key={step.num} className="group relative rounded-2xl border border-slate-200 bg-white p-8 transition hover:border-adam-300 hover:shadow-lg">
                <div className="mb-4 text-sm font-bold text-adam-accent">{step.num}</div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-adam-50">
                  <svg className="h-6 w-6 text-adam-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {step.num === "01" && <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                    {step.num === "02" && <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
                    {step.num === "03" && <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />}
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="border-y border-slate-100 bg-adam-50/30 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-adam-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-adam-700">
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
              Démo interactive
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Aperçu : votre CV adapté à une offre</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Collez une offre. Adam souligne les compétences recherchées et réécrit votre CV en temps réel.</p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span className="font-semibold text-adam-700">Offre :</span> Data Analyst — Shopify (Remote Canada). SQL, Python, Power BI, A/B testing. 3+ ans d'expérience.
              </div>
              <button onClick={() => setDemoOn(!demoOn)} className="rounded-lg bg-adam-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-adam-800">
                {demoOn ? "Voir l'original" : "Adapter à cette offre"}
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={`rounded-xl border bg-white p-6 shadow-sm transition ${demoOn ? "border-slate-200 opacity-80" : "border-adam-700"}`}>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">CV d'origine</h3>
              <div className="space-y-3 text-sm">
                <p className="text-lg font-bold text-slate-900">{baseCv.name}</p>
                <p className="text-slate-600">{baseCv.location} · {baseCv.email}</p>
                <p className="text-slate-700">{baseCv.summary}</p>
                <p className="font-semibold text-slate-900">Compétences : <span className="font-normal text-slate-600">{baseCv.skills}</span></p>
                <div>
                  <p className="font-semibold text-slate-900">{baseCv.title} — {baseCv.company}</p>
                  <ul className="mt-1 list-inside list-disc text-slate-600">
                    {baseCv.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border bg-white p-6 shadow-sm transition ${demoOn ? "border-adam-700 shadow-lg" : "border-slate-200 opacity-80"}`}>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-adam-700">CV adapté</h3>
              <div className="space-y-3 text-sm">
                <p className="text-lg font-bold text-slate-900">{baseCv.name}</p>
                <p className="text-slate-600">{baseCv.location} · {baseCv.email}</p>
                <p className="text-slate-700">
                  {demoOn
                    ? "Analyste de données avec 3 ans d'expérience. Spécialisé en analyse A/B, visualisation et automatisation des rapports pour produits SaaS."
                    : baseCv.summary}
                </p>
                <p className="font-semibold text-slate-900">
                  Compétences :{" "}
                  <span className="font-normal text-slate-600">
                    {demoOn ? "SQL, Python, Power BI, A/B testing, Tableau, Machine Learning" : baseCv.skills}
                  </span>
                  {demoOn && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">compétences recherchées</span>}
                </p>
                <div>
                  <p className="font-semibold text-slate-900">{baseCv.title} — {baseCv.company}</p>
                  <ul className="mt-1 list-inside list-disc text-slate-600">
                    {demoOn ? (
                      <>
                        <li>Conception de tableaux de bord Power BI et analyse A/B des campagnes, amélioration du taux de conversion de 15%</li>
                        <li>Analyse des comportements clients avec SQL et Python dans un environnement e-commerce à fort volume</li>
                      </>
                    ) : (
                      baseCv.bullets.map((b, i) => <li key={i}>{b}</li>)
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/auth" className="inline-flex items-center gap-2 rounded-xl bg-adam-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-adam-800">
              Essayer avec mon propre CV
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="bg-adam-50/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Pensé pour le marché canadien</h2>
            <p className="mt-3 text-slate-600">Chaque fonctionnalité est conçue pour vous aider à passer le filtre des recruteurs et des ATS.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Adaptation intelligente", desc: "Adam réorganise et réécrit votre CV pour chaque offre, en gardant votre voix et vos vraies expériences.", tag: "IA" },
              { title: "Score ATS en temps réel", desc: "Sachez instantanément si votre CV passera les filtres automatiques des recruteurs.", tag: "ATS" },
              { title: "Conformité canadienne", desc: "Pas de photo, pas de date de naissance. Format inverse-chronologique. Verbes d'action.", tag: "Canada" },
              { title: "Export PDF & DOCX", desc: "Téléchargez en PDF, DOCX ou TXT. Format Letter, typographie professionnelle, ATS-safe.", tag: "Export" },
              { title: "Bilingue FR / EN", desc: "Adam détecte la langue de l'offre et adapte votre candidature dans la bonne langue.", tag: "FR/EN" },
              { title: "Apprentissage continu", desc: "Chaque fois que vous gardez ou refusez un changement, Adam apprend vos préférences.", tag: "IA+" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-adam-200 hover:shadow-md">
                <div className="mb-3 inline-flex rounded-lg bg-adam-accent/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-adam-accent">{f.tag}</div>
                <h3 className="mb-2 font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Simple et transparent</h2>
            <p className="mt-3 text-slate-600">Commencez gratuitement. Payez seulement quand vous avez besoin de plus.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-8">
              <h3 className="text-lg font-bold text-slate-900">Gratuit</h3>
              <div className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-extrabold text-slate-900">0$</span></div>
              <p className="mt-1 text-sm text-slate-500">Pour démarrer</p>
              <ul className="mt-6 space-y-3">
                {["4 exports gratuits", "CV illimités", "Adaptation illimitée", "Score ATS en temps réel"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="mt-8 block rounded-xl border-2 border-adam-700 py-3 text-center font-semibold text-adam-700 transition hover:bg-adam-50">Commencer</Link>
            </div>
            <div className="rounded-2xl border-2 border-adam-700 bg-adam-50/30 p-8">
              <h3 className="text-lg font-bold text-adam-700">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-extrabold text-adam-700">1$</span><span className="text-sm text-slate-500">/export</span></div>
              <p className="mt-1 text-sm text-slate-500">Par export supplémentaire</p>
              <ul className="mt-6 space-y-3">
                {["Export PDF & DOCX", "Tous les formats", "Sans limite", "Paiement sécurisé (bientôt)"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <svg className="h-4 w-4 text-adam-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="mt-8 block rounded-xl bg-adam-700 py-3 text-center font-semibold text-white transition hover:bg-adam-800">Exporter</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-10 text-center text-3xl font-bold text-slate-900">Questions fréquentes</h2>
          <div className="space-y-4">
            {[
              { q: "Mes données restent-elles privées ?", a: "Oui. Votre CV et vos offres ne servent pas à entraîner des modèles publics. Tout reste dans votre compte." },
              { q: "Puis-je utiliser Adam en anglais ?", a: "Oui. Adam détecte la langue de l'offre et génère votre candidature dans la bonne langue." },
              { q: "Que se passe-t-il après les 4 exports gratuits ?", a: "Chaque export supplémentaire coûte 1$ USD. Aucun abonnement obligatoire." },
              { q: "Le format est-il vraiment canadien ?", a: "Oui : pas de photo, pas d'âge, format inverse-chronologique, verbes d'action et métriques." },
            ].map((item) => (
              <details key={item.q} className="group rounded-xl border border-slate-200 bg-white p-4 transition open:border-adam-300 open:shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-900">
                  {item.q}
                  <span className="text-adam-500 transition group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-adam-700 to-adam-800 px-8 py-16 text-center shadow-2xl">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-16 -translate-y-16 rounded-full bg-adam-accent/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-16 translate-y-16 rounded-full bg-adam-400/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white">Postulez à votre prochain poste dès aujourd'hui</h2>
              <p className="mx-auto mt-4 max-w-xl text-adam-100">Créez votre compte gratuit, importez votre CV, et laissez Adam faire le reste. En moins de 5 minutes.</p>
              <Link href="/auth" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-adam-700 shadow-lg transition hover:bg-adam-50">
                Commencer gratuitement
                <span>&rarr;</span>
              </Link>
              <p className="mt-4 text-sm text-adam-200">Aucune carte de crédit. Désinscription à tout moment.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm text-slate-400">© {new Date().getFullYear()} AdamCareers</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <span>Conçu pour le marché canadien</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
