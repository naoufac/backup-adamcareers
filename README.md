# ADAMJOBS

Plateforme d'adaptation automatique de CV et lettres d'accompagnement pour le
marche canadien. Un candidat depose une offre; ~30s plus tard il recoit un CV et
une lettre adaptes, au format canadien, dans sa voix. Bilingue FR/EN.

> MVP scope and product vision live in `Pitch_JobPilot_MVP.docx`.
> This repo holds the implementation.

## Architecture (split stack, one host)

```
apps/web   Next.js (App Router) + Tailwind     ->  adam.<domain>   (8780)
apps/api   Fastify + TypeScript                ->  api.adam.<domain> (8781)
           Postgres 16  (127.0.0.1:5433 host)
           Redis 7     (queue / cache)
```

Both app services are containerized and run from one `docker-compose.yml`,
behind the shared host Caddy edge. The API is on its own subdomain so it can
serve a future mobile client too.

## Quick start (local, host-native)

Requirements: Node 22, pnpm 11.

```bash
pnpm install
cp .env.example .env          # fill secrets for later milestones
pnpm dev                      # web on :8780, api on :8781
```

Verify:
```bash
pnpm gate                     # typecheck + build, all workspaces
node -e 'fetch("http://localhost:8781/healthz").then(r=>r.text()).then(console.log)'
```

## Run the full stack in containers

```bash
cp .env.example .env          # adjust POSTGRES_PASSWORD, AUTH_JWT_SECRET, etc.
docker compose up -d --build
docker compose ps
# api  -> http://localhost:8781/healthz   (200 {"status":"ok"})
# web  -> http://localhost:8780           (renders, calls api server-side)
```

Host ports are bound to `127.0.0.1` only; the public edge is Caddy.

## Edge (Caddy)

`Caddyfile.example` ships two site blocks (sslip fallbacks that need no DNS).
Drop them into the host Caddyfile and reload. Swap in real domains once DNS lands.

## Verify gate

The deterministic gate for this project:

```bash
pnpm gate      # = pnpm -r run typecheck && pnpm -r run build
```

## Roadmap

| M  | Deliverable                                                       | Status |
|----|-------------------------------------------------------------------|--------|
| M0 | Scaffold: monorepo, web + api, compose, gate, containers          | done   |
| M1 | Auth: email/password + Composio OAuth (Google, LinkedIn)          | next   |
| M2 | Onboarding: CV upload -> parse -> Adam interview -> master profile |        |
| M3 | Fast Canadian-style CV builder (schema, templates, scorecard)     |        |
| M4 | Adaptation loop (offer -> research -> highlighted diff keep/cancel)|       |
| M5 | Canadian cover letter + export (PDF/DOCX)                         |        |
| M6 | Daily job search (Job Bank GC + Adzuna CA) + dashboard           |        |
| M7 | Preference-vector learning (no-LLM feedback loop)               |        |

### Prerequisites flagged for later milestones

- `composio login` is required before M1 (Composio CLI session is empty today).
- A funded Z.AI key (GLM-5.2, `coding/paas/v4`) must go in `.env` for M2+.
- Domain DNS zones (user-managed) before public TLS via Caddy.

## Component: export-engine

Location: `packages/export-engine/`

The first component extracted under the workspace small-components standard.

### What it does

Generates CV and cover-letter exports in four formats:

- **TXT** — plain text, most ATS-safe
- **HTML** — styled preview / fallback
- **DOCX** — Word document via `docx` (browser-side `Packer.toBlob`)
- **PDF** — text-selectable Letter-size PDF via `jspdf`

### Why browser-side

Export generation is pure compute over data the UI already owns. Moving it to the browser:

- Removes heavy server dependencies (Puppeteer, headless Chromium).
- Scales with users, not with server CPU.
- Keeps the server small: it only enforces the export entitlement gate and decrements usage.

### Contract

- UI calls `POST /api/export/allow` before generating.
- Server returns `{ allowed: true, paid }` and increments `freeExportsUsed`, or returns `402`.
- If allowed, UI calls `cvToText`, `cvToHtml`, `cvToDocx`, `cvToPdf`, `coverLetterToText`, `coverLetterToHtml`, `coverLetterToDocx`, or `coverLetterToPdf` from `@adamjobs/export-engine` and triggers the download.

### Gate

```bash
pnpm --filter @adamjobs/export-engine run typecheck
pnpm --filter @adamjobs/export-engine run build
pnpm --filter @adamjobs/export-engine run test
```

## Component: cv-engine

Location: `packages/cv-engine/`

Browser-side package for CV schema, normalization, and Canadian validation/scorecard.

### What it contains

- `CvJson`, `CvExperienceEntry`, `CvEducationEntry` types
- `normalizeCv(raw)` — coerce LLM output into a canonical CV shape
- `validateCanadianCv(cv)` — returns `{ complianceScore, atsScore, violations[] }`

### Why browser-side

Validation and scoring are deterministic functions over CV data. No secrets, no heavy compute. Moving them to the browser keeps feedback instant and removes one more reason for the server to grow.

### Gate

```bash
pnpm --filter @adamjobs/cv-engine run typecheck
pnpm --filter @adamjobs/cv-engine run build
pnpm --filter @adamjobs/cv-engine run test
```

## Component: offer-engine

Location: `packages/offer-engine/`

Browser-side package for job-offer parsing, skill matching, and CV adaptation diffing.

### What it contains

- `parseOffer(text)` — rule-based extractor for title, company, location, work mode, required/nice-to-have skills, responsibilities, language, and salary
- `matchSkills(cv, offer)` — coverage score with evidence, missing skills, and suggestions
- `diffCv(base, variant)` / `applyChanges(base, changes, acceptedIds)` — atomic reviewable adaptation diff

### Why browser-side

Offer parsing and skill matching are deterministic. Running them in the browser means the user sees feedback instantly and the server only persists the parsed result.

### Gate

```bash
pnpm --filter @adamjobs/offer-engine run typecheck
pnpm --filter @adamjobs/offer-engine run build
pnpm --filter @adamjobs/offer-engine run test
```

## Component: ui-kit

Location: `packages/ui-kit/`

Shared presentational components and design tokens for the AdamCareers shell.

### What it contains

- `Logo`, `Button`, `Card`, `Spinner`, `Toast`
- `useLocalStorage` hook
- `ThemeProvider` + `useTheme`
- Shared Tailwind config (`themeConfig`) and global styles

### Why a separate package

The UI shell should own only composition, not re-implement buttons and cards. A shared kit enforces one visual language and prevents duplication as more shells or pages are added.

### How to import

```tsx
import { Logo, Button, Card, Spinner, Toast, useLocalStorage, ThemeProvider } from "@adamjobs/ui-kit";
```

Shared Tailwind theme:

```ts
import { themeConfig } from "@adamjobs/ui-kit/tailwind.config";
```

### Gate

```bash
pnpm --filter @adamjobs/ui-kit run typecheck
pnpm --filter @adamjobs/ui-kit run build
pnpm --filter @adamjobs/ui-kit run test
```

## Layout

```
apps/api/   Fastify API  (src/server.ts, /healthz)
apps/web/   Next.js web  (src/app)
packages/   Shared, independently versioned components
  cv-engine/       Browser-side CV validation and normalization
  export-engine/   Browser-side document generation
  offer-engine/    Browser-side offer parsing and adaptation diff
  ui-kit/          Shared presentational components and styles
docker-compose.yml        postgres + redis + api + web
Caddyfile.example         edge config (sslip fallbacks)
.env.example              all config knobs (no secrets committed)
```
