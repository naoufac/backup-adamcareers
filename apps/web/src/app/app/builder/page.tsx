"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/site-nav";
import { api } from "@/lib/api";
import { CvScorecard, type Scores } from "@/components/scorecard";
import { CvEditor } from "@/components/cv-editor";
import { ExportBar } from "@/components/export-bar";

interface CvData {
  contact?: { name?: string; email?: string; phone?: string; location?: string };
  summary?: string;
  coreCompetencies?: string[];
  experience?: { title?: string; company?: string; startDate?: string; endDate?: string; bullets?: string[] }[];
  education?: { institution?: string; degree?: string; field?: string }[];
  languages?: { name: string; level?: string }[];
}

interface BuildResult {
  cv: CvData;
  questions: string[];
  scores: Scores;
}

interface Message {
  role: "adam" | "user";
  text: string;
}

interface SavedInterview {
  locale: "fr" | "en";
  targetRole: string;
  messages: Message[];
  answers: Record<string, string>;
  questions: string[];
  questionIndex: number;
}

const STORAGE_KEY = "adam_interview";

export default function BuilderPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [targetRole, setTargetRole] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [started, setStarted] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || loading || result) return;
    const savedRaw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (savedRaw) {
      try {
        const parsed: SavedInterview = JSON.parse(savedRaw);
        if (parsed && parsed.messages && parsed.messages.length > 0) {
          setLocale(parsed.locale ?? "fr");
          setTargetRole(parsed.targetRole ?? "");
          setMessages(parsed.messages ?? []);
          setAnswers(parsed.answers ?? {});
          setQuestions(parsed.questions ?? []);
          setQuestionIndex(parsed.questionIndex ?? 0);
          setStarted(true);
          return;
        }
      } catch {
        // ignore invalid localStorage
      }
    }
    api<{ cv: CvData | null }>("/api/cv/mine")
      .then((d) => {
        if (d.cv) {
          setResult({ cv: d.cv, questions: [], scores: { violations: [], complianceScore: 0, atsScore: 0 } });
        }
      })
      .catch(() => {});
  }, [user, loading, result]);

  useEffect(() => {
    if (typeof window === "undefined" || !started || messages.length === 0) return;
    if (result) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const state: SavedInterview = { locale, targetRole, messages, answers, questions, questionIndex };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [locale, targetRole, messages, answers, questions, questionIndex, started, result]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy, questionIndex]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
      <AppHeader />
                <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 rounded bg-slate-200" />
            <div className="h-64 rounded-xl bg-slate-100" />
          </div>
        </main>
      </div>
    );
  }

  const resetInterview = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    setLocale("fr");
    setTargetRole("");
    setMessages([]);
    setQuestions([]);
    setAnswers({});
    setCurrentAnswer("");
    setQuestionIndex(0);
    setResult(null);
    setStarted(false);
    setErr("");
  };

  const startInterview = async () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    setErr(""); setBusy(true); setStarted(true);
    try {
      const data = await api<{ questions: string[] }>("/api/cv/build", {
        method: "POST",
        json: { phase: "interview", seed: { name: user.name, email: user.email, targetRole }, locale },
      });
      const qs = data.questions.filter(Boolean).slice(0, 8);
      setQuestions(qs);
      setMessages([{ role: "adam", text: qs[0] ?? "Parlez-moi de votre expérience principale." }]);
      setQuestionIndex(0);
      setAnswers({});
      setCurrentAnswer("");
      setResult(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const sendAnswer = () => {
    if (!currentAnswer.trim()) return;
    const nextIndex = questionIndex + 1;
    const answerObj = { ...answers, [`q${questionIndex}`]: currentAnswer.trim() };
    setAnswers(answerObj);
    setMessages((prev) => [...prev, { role: "user", text: currentAnswer.trim() }]);
    setCurrentAnswer("");
    if (nextIndex < questions.length) {
      setQuestionIndex(nextIndex);
      setMessages((prev) => [...prev, { role: "adam", text: questions[nextIndex] }]);
    } else {
      buildCv(answerObj);
    }
  };

  const buildCv = async (finalAnswers: Record<string, string>) => {
    setBusy(true); setErr("");
    try {
      const data = await api<BuildResult>("/api/cv/build", {
        method: "POST",
        json: { phase: "build", answers: { ...finalAnswers, name: user.name ?? "", email: user.email, targetRole }, targetRole, locale },
      });
      setResult(data);
      setMessages((prev) => [...prev, { role: "adam", text: "Votre CV canadien est prêt. Vous pouvez l'éditer et le télécharger ci-dessous." }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de génération");
    } finally {
      setBusy(false);
    }
  };

  const updateCv = (cv: CvData) => {
    setResult((r) => (r ? { ...r, cv } : r));
    setSaved(false);
  };

  const saveCv = async () => {
    if (!result) return;
    setBusy(true); setErr("");
    try {
      await api("/api/cv/mine", { method: "PUT", json: { cv: result.cv } });
      setSaved(true);
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-bold text-adam-700">Créer mon CV canadien</h1>
        <p className="mb-8 text-sm text-slate-500">Adam vous pose quelques questions, puis génère un CV conforme aux standards canadiens.</p>

        {!result && messages.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Langue du CV</label>
                <div className="flex gap-2">
                  {(["fr", "en"] as const).map((l) => (
                    <button key={l} onClick={() => setLocale(l)} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${locale === l ? "border-adam-700 bg-adam-50 text-adam-700" : "border-slate-300 text-slate-500"}`}>
                      {l === "fr" ? "Français" : "English"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Poste visé</label>
                <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="ex: Data Analyst" className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-adam-700" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={startInterview} disabled={busy} className="rounded-lg bg-adam-700 px-4 py-2 text-sm font-semibold text-white hover:bg-adam-800 disabled:opacity-50">
                {busy ? "..." : "Commencer l'interview avec Adam"}
              </button>
              <Link href="/app/upload" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Importer mon CV
              </Link>
            </div>
          </div>
        )}

        {!result && messages.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div ref={messagesContainerRef} className="mb-4 max-h-[420px] space-y-3 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "adam" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === "adam" ? "rounded-tl-none bg-slate-100 text-slate-800" : "rounded-tr-none bg-adam-700 text-white"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {busy && <div className="text-sm text-slate-400">Adam écrit...</div>}
            </div>
            {!busy && questionIndex < questions.length && (
              <div className="flex gap-2">
                <input
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAnswer()}
                  placeholder="Votre réponse..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-adam-700"
                />
                <button onClick={sendAnswer} className="rounded-lg bg-adam-700 px-4 py-2 text-sm font-semibold text-white hover:bg-adam-800">Envoyer</button>
              </div>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={resetInterview}
                className="text-sm font-medium text-slate-500 underline hover:text-slate-700"
              >
                Recommencer l'interview
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <ExportBar cv={result.cv} fileName={result.cv.contact?.name?.toLowerCase().replace(/\s+/g, "-") ?? "cv-adamcareers"} />
                <div className="flex items-center gap-2">
                  <button onClick={saveCv} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                    {busy ? "..." : saved ? "Enregistré ✓" : "Enregistrer"}
                  </button>
                  <Link href="/app/offers/new" className="rounded-lg bg-adam-700 px-4 py-2 text-sm font-semibold text-white hover:bg-adam-800">
                    Adapter à une offre
                  </Link>
                </div>
              </div>
              <CvEditor cv={result.cv} onChange={updateCv} />
              {err && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={resetInterview}
                  className="text-sm font-medium text-slate-500 underline hover:text-slate-700"
                >
                  Refaire l'interview
                </button>
              </div>
            </div>
            <div className="mt-6 lg:mt-0">
              <CvScorecard scores={result.scores} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
