# AdamCareers — Finish the Architecture

**Goal:** Complete the small-components + browser-first refactor. Extract remaining services, verify the full stack, and ship it.

---

## Phase 1: Extract remaining services

- [ ] **1.1 Extract `services/profiles`**
  - Move profile CRUD from `apps/api/src/routes/me.ts` and `apps/api/src/routes/cv-builder.ts`.
  - Owns: `master_profiles`, `experiences`, `offers`, `applications` tables.
  - Contract:
    - `GET /profiles/me`
    - `PUT /profiles/me`
    - `GET /profiles/me/cv`
    - `PUT /profiles/me/cv`
    - `GET /profiles/me/usage`
    - `GET /profiles/experiences`
    - `POST /profiles/experiences`
    - `PUT /profiles/experiences/:id`
    - `DELETE /profiles/experiences/:id`
    - `GET /profiles/offers`
    - `POST /profiles/offers`
    - `GET /profiles/offers/:id`
    - `GET /profiles/applications`
    - `POST /profiles/applications`
    - `GET /profiles/applications/:id`
    - `PUT /profiles/applications/:id`
  - Database: own Postgres schema namespace or dedicated DB.
  - No compute. Only encrypted CRUD.

- [ ] **1.2 Extract `services/billing`**
  - Move Stripe logic from `apps/api/src/routes/billing.ts`.
  - Owns: `subscriptions` table, Stripe customer cache, webhook handling.
  - Contract:
    - `POST /billing/checkout`
    - `POST /billing/portal`
    - `POST /billing/webhook`
    - `GET /billing/status`
    - `POST /export/allow` (delegates usage check to profiles service)
  - Keep payment secrets isolated from other services.

- [ ] **1.3 Extract `services/inference-gateway`**
  - Move LLM calls from `apps/api/src/routes/cv-builder.ts`, `offers.ts`, `onboarding.ts`.
  - Owns: API keys, provider fallbacks, prompt templates.
  - Contract:
    - `POST /generate/cv-interview`
    - `POST /generate/cv-build`
    - `POST /generate/offer-parse`
    - `POST /generate/cover-letter`
    - `POST /generate/company-research`
  - No storage. Stateless inference.

---

## Phase 2: Update `apps/api` shell

- [ ] **2.1 Remove remaining route handlers** from `apps/api/src/routes/`:
  - `me.ts`
  - `cv-builder.ts`
  - `offers.ts`
  - `onboarding.ts`
  - `jobs.ts`
  - `export-allow.ts` (move to billing service)
- [ ] **2.2 Convert `apps/api` to a thin gateway**
  - Proxies routes to the correct service.
  - Adds auth middleware that validates JWT via `services/auth`.
  - No direct DB access.
- [ ] **2.3 Update `apps/api/package.json`**
  - Remove heavy deps now owned by other services.
  - Add `@fastify/http-proxy` if needed for gateway mode.

---

## Phase 3: Update shell (`apps/web`)

- [ ] **3.1 Update API base configuration**
  - Point to correct services or keep using the gateway.
  - Add env vars for service URLs if shell calls services directly.
- [ ] **3.2 Wire browser engines**
  - Use `@adamjobs/cv-engine` in builder page and scorecard.
  - Use `@adamjobs/offer-engine` in offers pages.
  - Use `@adamjobs/export-engine` in export bar (already done).
  - Use `@adamjobs/ui-kit` for shared components.
- [ ] **3.3 Remove dead code**
  - Delete old API client wrappers no longer used.
  - Clean up unused imports.

---

## Phase 4: Verify the full stack

- [ ] **4.1 Run all gates in isolation**
  ```bash
  pnpm -r run typecheck
  pnpm -r run build
  pnpm -r run test
  ```
- [ ] **4.2 Run local docker compose**
  ```bash
  docker compose up -d --build
  docker compose ps
  curl http://localhost:8781/healthz
  curl http://localhost:8782/healthz
  curl http://localhost:8783/healthz
  curl http://localhost:8784/healthz
  curl http://localhost:8785/healthz
  ```
- [ ] **4.3 Test user flows**
  - Register / login
  - Build CV via interview
  - Parse an offer
  - Export CV PDF/TXT/DOCX
  - Stripe checkout (test mode)

---

## Phase 5: Deploy

- [ ] **5.1 Add Caddy routes for new services**
  - `api.adamcareers.com` → `apps/api`
  - `auth.adamcareers.com` → `services/auth`
  - `profiles.adamcareers.com` → `services/profiles`
  - `billing.adamcareers.com` → `services/billing`
  - `inference.adamcareers.com` → `services/inference-gateway`
- [ ] **5.2 Update environment variables on the host**
  - `AUTH_SERVICE_URL`
  - `PROFILES_SERVICE_URL`
  - `BILLING_SERVICE_URL`
  - `INFERENCE_SERVICE_URL`
  - Database URLs per service
- [ ] **5.3 Run migrations for each service**
- [ ] **5.4 Deploy and smoke test live**

---

## Phase 6: Documentation

- [ ] **6.1 Update `README.md`** with:
  - Full architecture diagram
  - Each service and its contract
  - How to run each component independently
  - How to run the full stack locally
- [ ] **6.2 Update `ARCHITECTURE.md`** to mark services as completed.
- [ ] **6.3 Update `ENGINEERING-STANDARD.md`** with any lessons learned.

---

## Done when

- [ ] All 5 services extracted and typechecking.
- [ ] All 4 browser packages built and tested.
- [ ] Docker compose runs the full stack locally.
- [ ] Live smoke test passes register → build CV → parse offer → export PDF.
- [ ] Deployed to production with Caddy routing.
