# AdamCareers Target Architecture

**Date:** 2026-08-19  
**Standard:** Small components + browser-first compute.

---

## Principle

AdamCareers is broken into single-purpose components. Each component owns one bounded context, deploys independently, and fails in isolation.

Server-side code is minimized to:
- Authentication and session management
- Payment processing and entitlements
- Storing encrypted client information
- Calling external APIs that require secrets

Everything else — document generation, CV validation, adaptation logic, offer parsing — runs in the browser.

---

## Component map

```
┌─────────────────────────────────────────────────────────────┐
│                         SHELL                                │
│              Next.js app — UI composition only                │
│          No business logic. Calls services and engines.       │
└──────────────┬────────────────────────────────────────────────┘
               │
    ┌──────────┴──────────┬──────────────┬──────────────┐
    │                     │              │              │
┌───▼────┐          ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
│  auth  │          │ billing  │  │ profiles │  │ inference│
│service │          │ service  │  │ service  │  │ gateway  │
└────────┘          └──────────┘  └──────────┘  └──────────┘
    JWT                 Stripe        Postgres        LLM keys
   OAuth                entitlements   encrypted      Mistral/Kimi/GLM
   sessions             usage         user data

┌─────────────────────────────────────────────────────────────┐
│                    BROWSER PACKAGES                           │
│  @adamjobs/export-engine   — PDF/DOCX/TXT/HTML generation    │
│  @adamjobs/cv-engine       — validation, scorecard, schemas  │
│  @adamjobs/offer-engine    — offer parsing, adaptation diff   │
│  @adamjobs/ui-kit          — shared components and design     │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. `shell` — `apps/web`

- Next.js + Tailwind.
- Only UI composition and routing.
- Fetches data from services.
- Imports browser packages for local compute.

**Owns:**
- Pages and navigation
- Layout and theme
- Calling service APIs
- Running browser engines

**Does not own:**
- Business rules
- Document generation
- LLM prompts
- Payment logic

---

### 2. `auth` service

- Email/password, Composio OAuth (Google, LinkedIn).
- JWT issuance and validation.
- Password reset, email verification.

**Owns:**
- `users` table (email, passwordHash, name, locale)
- Sessions and cookies
- OAuth flow state

**Contract:**
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/verify-email`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- OAuth callback endpoints

---

### 3. `billing` service

- Stripe Checkout and Portal.
- Export entitlements and usage limits.
- Subscription status.

**Owns:**
- `subscriptions` table or stripe customer cache
- Usage counters (delegated from profiles service or own table)

**Contract:**
- `POST /billing/checkout`
- `POST /billing/portal`
- `POST /billing/webhook`
- `GET /billing/status`
- `POST /export/allow` (delegates to profiles service for counter)

---

### 4. `profiles` service

- Encrypted user profile storage.
- Master CV, writing style, preference vector, export usage.

**Owns:**
- `master_profiles` table
- `experiences` table
- `offers` table (or move to offer service later)
- `applications` table (or move to application service later)

**Contract:**
- `GET /profiles/me`
- `PUT /profiles/me`
- `GET /profiles/me/cv`
- `PUT /profiles/me/cv`
- `GET /profiles/me/usage`

**Rules:**
- No compute. Only CRUD over encrypted user data.
- Other services read/write profiles only through this service.

---

### 5. `inference-gateway` service

- Holds LLM API keys.
- Exposes a small, typed API for generation tasks.
- Routes between Mistral → Kimi → GLM.

**Owns:**
- API keys and provider fallbacks
- Prompt templates per task
- Token budgets and retries

**Contract:**
- `POST /generate/cv-interview` — returns interview questions
- `POST /generate/cv-build` — returns structured CV JSON
- `POST /generate/offer-parse` — returns parsed offer
- `POST /generate/cover-letter` — returns cover letter text
- `POST /generate/company-research` — returns company summary

**Rules:**
- Never stores user data.
- Accepts only sanitized, non-PII payloads from the shell.
- Returns structured JSON, never free text to the shell directly.

---

### 6. `@adamjobs/export-engine` — browser package

Already extracted.

**Owns:**
- TXT, HTML, DOCX, PDF generation
- Canadian CV and cover-letter layout

**Contract:**
- `cvToText`, `cvToHtml`, `cvToDocx`, `cvToPdf`
- `coverLetterToText`, `coverLetterToHtml`, `coverLetterToDocx`, `coverLetterToPdf`

---

### 7. `@adamjobs/cv-engine` — browser package

**Owns:**
- CV schema validation
- Canadian CV scorecard
- Normalization helpers
- Interview answer shaping

**Contract:**
- `validateCanadianCv(cv): Scorecard`
- `normalizeCv(raw): CvJson`
- `scoreSection(section, rules): Score`

---

### 8. `@adamjobs/offer-engine` — browser package

**Owns:**
- Offer text parsing (rule-based, no LLM)
- Skill extraction
- Highlight diff between original CV and adapted CV
- ATS keyword matching

**Contract:**
- `parseOffer(text): OfferParsed`
- `matchSkills(cv, offer): MatchResult`
- `highlightDiff(original, adapted): DiffBlock[]`

---

### 9. `@adamjobs/ui-kit` — browser package

**Owns:**
- Shared React components
- Tailwind theme and tokens
- Logo, nav, buttons, forms

---

## Data ownership

| Data | Owner |
|---|---|
| email, passwordHash, OAuth ids | `auth` service |
| masterProfiles, experiences, offers, applications | `profiles` service |
| stripe customer, subscription status | `billing` service |
| API keys, provider state | `inference-gateway` |
| document templates | browser packages |

No shared tables. Each service has its own database or schema namespace.

---

## Communication rules

1. **Shell → service:** HTTP / REST / JSON.
2. **Service → service:** HTTP only when necessary; prefer event bus for async work.
3. **Shell → browser engine:** function call.
4. **Browser engine never talks to database or holds secrets.**

---

## Migration path

Current state: `apps/web` + `apps/api` monolith.

Target state: shell + 5 services + 4 browser packages.

Order of extraction:

1. ✅ `export-engine` — done.
2. `cv-engine` — extract validation/scorecard from `cv-builder.ts` into browser package.
3. `auth` service — split auth routes into own deployable.
4. `profiles` service — split profile CRUD from `me.ts` and `cv-builder.ts`.
5. `inference-gateway` — extract LLM calls from `cv-builder.ts`, `offers.ts`, `onboarding.ts`.
6. `offer-engine` — extract offer parsing and diff logic into browser package.
7. `billing` service — split Stripe and entitlement logic.
8. `ui-kit` — extract shared components.

---

## Forbidden

- Server-side document generation.
- Server-side rule-based offer parsing (keep deterministic logic in browser).
- Direct database access from the shell or from another service's tables.
- One deployable owning auth + billing + inference + profiles.

---

*Architecture owner: Ka. First component landed 2026-08-19.*
