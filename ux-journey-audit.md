# AdamCareers UX Journey Audit — 2026-08-08

## Executive summary

**Current practical score: 1/10** is fair. The tech works, but the user journey is a collection of disconnected features, not a coherent "get a job in Canada" flow. The user constantly has to guess what to do next, the CV is hidden, exports are hidden, and the onboarding is a wall of text fields.

Below is the real journey, the blockers, and a concrete Phase 2 plan.

---

## The real user journey today

### 1. Landing page (fr/en)

**What happens:**
- Clean landing page, hero is fine, pricing is clear.
- "Commencer gratuitement" goes to /auth.
- No social proof, no concrete example, no risk reversal beyond "no credit card."
- The hero dashboard mockup is a decorative skeleton, not a real preview.

**Friction:**
- A visitor does not know what the actual output looks like before signing up.
- No sample CV preview, no "try without account" flow.
- No obvious differentiator from Rezi, Teal, or even ChatGPT.

### 2. Auth

**What works:**
- Login/register toggle is clean.
- Auto-redirects to /app after auth.

**Friction:**
- No password confirmation field, no visible password toggle.
- No "magic link" or Google sign-in (not necessary for MVP, but nice).
- Error messages are generic ("Erreur").

### 3. Dashboard (/app)

**What happens:**
- Four cards: Adapter, CV, Importer, Rechercher.
- Usage banner shows remaining exports.

**Friction (major):**
- **No saved CV visible.** The user has to remember they built/imported something. The dashboard is a menu, not a status board.
- **No obvious next action.** If you just signed up, the dashboard asks you to choose a feature instead of guiding you through a sequence.
- **No history.** No list of past offers, past CVs, or past applications.
- The "Offres" and "Adapter" nav links are confusingly similar.
- "Rechercher des offres" looks like the main action but is a dead-end placeholder (external job search is not integrated live).

### 4. Create a CV (/app/builder)

**What happens:**
- Two inputs: language + target role.
- Click "Générer les questions" → LLM asks 5-8 questions.
- User pastes answers as lines of text.
- Click "Générer mon CV" → CV appears with preview and scorecard.
- Export bar is inside the preview card.

**Friction (major):**
- **No saved CV indicator.** When you leave the page and come back, the dashboard does not show your CV. The builder starts from scratch every time (it does not load `cv/mine`).
- **The interview is fragile.** Pasting answers line-by-line matched to question order is awkward. If the LLM returns 8 questions and the user answers 5, mapping is broken.
- **No way to edit answers after generation.** The user sees the CV, but to change the source answers they must restart.
- **Export bar is invisible until you scroll into the preview.** It should be a primary action at the top of the result.
- **No download format help.** A user might not know whether to use PDF or DOCX.
- **No "apply this CV to an offer" shortcut.** After building a CV, the natural next step is to paste an offer. There is no button for that.

### 5. Import a CV (/app/upload)

**What happens:**
- File picker or paste text.
- Parse → saves CV to profile.
- Shows style detected and a "Continuer" button to dashboard.

**Friction:**
- **No preview of the parsed CV.** The user cannot check what Adam extracted before it is saved.
- **No way to fix extraction errors inline.** If the parser drops a job or misreads a date, the user has no UI to correct it.
- **"Continuer" goes to dashboard, not to the CV editor.** So the user has to hunt for the CV again.

### 6. Adapt to an offer (/app/offers/new)

**What happens:**
- Paste offer text.
- Adam parses it and shows the offer detail page.
- User clicks "Rechercher" (company research), then "Adapter mon CV et ma lettre."
- Diff review appears → accept/reject changes → edit cover letter → finalize.
- After finalize, export bar appears.

**Friction (major):**
- **Company research is a manual extra step.** Why is it not part of the adaptation? It breaks momentum.
- **Diff review is confusing.** "Changes" are shown as abstract diffs, but there is no side-by-side before/after of the full CV. The user cannot see the actual adapted CV.
- **No preview of the final adapted CV before finalize.** The user has to accept/reject changes blind, then only sees the export after finalizing.
- **Finalize is irreversible and poorly explained.** What does "finaliser" actually do? It saves the application. But the user thinks it might send something.
- **Export only appears after finalize.** If the user wants to preview the export first, they cannot.
- **No way to go back to the base CV from the offer page.** If the adaptation is bad, the user has to navigate away manually.

### 7. Export

**What works:**
- TXT, PDF, DOCX are all functional.
- Free tier counts correctly.
- Payment stub triggers a `confirm()` dialog.

**Friction:**
- **Export button design is inconsistent:** red PDF, blue DOCX, grey TXT. Red usually means danger/delete. The primary export should be the most prominent.
- **No filename customization.** Files are named `cv-adamcareers.pdf` or `lettre-adamcareers.pdf`.
- **No page count / file size preview.** A PDF might be 1 page or 3 pages; the user does not know.
- **Payment stub is a browser `confirm()` dialog.** It looks scammy. This is a $1 transaction; it should at least look like a real paywall (even if still stubbed).
- **No confirmation after download.** The user does not know if the file downloaded successfully.
- **The CV builder export does not default to the user's preferred format.** Some users always want DOCX.

### 8. Job search (/app/jobs)

**What happens:**
- Search box + location.
- Results are shown from whatever source the backend provides.
- Each job has a "Score" button to compute match against the user's CV.

**Friction (major):**
- **Job search is not obviously useful.** If there is no live feed of Canadian jobs, this page is empty and disappointing.
- **Scoring is manual.** The user has to click "Score" per job. It should be automatic.
- **No "Adapt to this job" action.** The natural loop is: search → score → adapt → export. The third step is missing.
- **No filters (remote, salary, posted date).**

### 9. General UX issues

- **No global loading state.** Buttons say "..." but no skeleton for full-page transitions.
- **No empty states with guidance.** Empty dashboard, empty job search, empty offer history all just say "rien" or show a blank list.
- **No error recovery.** If the LLM fails (502), the user sees "CV generation failed; try again" with no option to retry, edit inputs, or report.
- **No mobile consideration.** The builder textarea and preview side-by-side will collapse badly on mobile.
- **Language is inconsistent.** Some pages are French by default but mix English labels. Some components are hardcoded French.
- **No user profile/settings.** Cannot change name, password, or language preference.
- **No logout confirmation or account deletion.**

---

## Phase 2 proposal: make it practical (score 6/10)

### A. Single clear path: Dashboard → Guide → Action

Replace the four-card dashboard with a **state-aware home**:

```
IF no CV yet:
  Hero: "Commencez par votre CV" with two buttons: [Importer mon CV] [Créer un CV avec Adam]
  Subtle: comment ça marche

IF CV exists but no recent offer:
  Show compact CV summary card at top.
  Primary CTA: [Adapter à une offre]
  Secondary: [Modifier mon CV], [Télécharger], [Historique]

IF CV exists and offers exist:
  Show recent offers as cards, each with status: drafted / finalized / exported.
  Primary CTA: [Nouvelle offre]
```

### B. CV builder rewrite

1. **Load existing CV first.** If `cv/mine` exists, pre-fill the builder. Do not make the user retype.
2. **Conversational chat instead of line-paste.** Show one question at a time, like a chat. Adam asks, user replies, Adam asks follow-up. This is much more natural and forgiving.
3. **Inline editing after generation.** The preview should be a real editor (not just a visual). Add/edit/remove experience, skills, education directly.
4. **Sticky export bar at the top.** After generation, the export bar is always visible above the CV, not buried inside the preview card.
5. **Smart defaults:** remember preferred language and default export format.

### C. Offer adaptation rewrite

1. **Auto-trigger company research and adaptation in one click.** "Coller une offre → Analyser et adapter" → show the result.
2. **Side-by-side preview.** Left: original CV. Right: adapted CV. Highlight changes in color. This is 10x clearer than abstract diffs.
3. **Inline editing of the adapted CV.** Let the user tweak the result before finalizing.
4. **Rename "Finaliser" to "Enregistrer cette candidature"** and explain it just saves for export.
5. **Export without finalizing.** Let the user download at any point.
6. **Direct button to apply:** after export, show "Adapter à une autre offre" and "Retour au tableau de bord."

### D. Export improvements

1. **Make PDF the primary action.** Use a single prominent "Télécharger le CV" button, with a dropdown for TXT/DOCX.
2. **Show filename and format hint.** "cv-ayoub-elamrani-data-analyst.pdf — format canadien ATS"
3. **Better paywall.** Replace the `confirm()` with a styled modal: "4 exports gratuits utilisés. Continuez pour 1$/export." Even if payment is stubbed, it should look real.
4. **Post-download toast.** "Téléchargement commencé." or "CV prêt."

### E. Job search or kill it

Two options:
- **Integrate it properly:** live Canadian job listings (Indeed/LinkedIn scrape or Adzuna API), auto-score, one-click "Adapter cette offre."
- **Kill it for now.** Replace with a simple prompt: "Collez l'URL ou le texte d'une offre" on the dashboard. This removes the dead-end and focuses on the core loop.

**Recommendation:** kill it for MVP. The core value is CV + adaptation, not job search. Job search can come back later.

### F. Quick wins (this week)

- [ ] Dashboard shows CV status and recent offers.
- [ ] Builder pre-loads existing CV.
- [ ] Export bar moved to top of result + primary CTA restyle.
- [ ] Offer page: side-by-side CV preview + inline edit.
- [ ] Remove or hide the job search page.
- [ ] Add a simple "How it works" tooltip or progress indicator on first login.
- [ ] Consistent language labels (FR first, EN toggle if needed).

### G. Trust and conversion (Phase 2b)

- [ ] Sample CV preview on landing page (no signup).
- [ ] One example offer + adaptation result as a demo.
- [ ] Testimonials (even 1-2 real ones).
- [ ] FAQ: "Pourquoi le format canadien?", "Mes données?", "Que se passe-t-il après les 4 exports?"
- [ ] Real payment modal (Stripe/PayPal) instead of stub.

---

## What is technically wrong vs. what is UX wrong

Technically, almost nothing is broken:
- Auth works.
- LLM works.
- PDF/DOCX/TXT exports work.
- Database saves CVs and offers.
- Caddy and domains are live.

The problem is **interaction design**. The user has to be a product manager to know what to do. The app shows capabilities; it does not guide a job seeker through a task.

## Recommendation

Do not add more features. Refocus the existing ones into one coherent flow:

**Import or build CV → review and edit → paste an offer → see adapted CV → edit → download → repeat.**

Everything else is distraction until that loop is effortless.
