# LingoHub AI — Requirements traceability & implementation notes

This document maps [`requirements.txt`](requirements.txt) (PRD / SADD / MVP) to the current codebase, describes **how** each implemented area works, and lists **gaps** with reasons (out of scope, needs infrastructure, or follow-up work).

---

## 1. Executive summary

| Area                                                                                                                                    | Status                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Core MVP (auth, roles, translate workflow, AI draft, tasks, versions, scores, reputation, glossary, Stripe subscription, developer API) | **Implemented** (see below)                                                                                                                     |
| Email OTP for password sign-up                                                                                                          | **Implemented** — SMTP only (Nodemailer); [`backend/src/services/emailService.js`](backend/src/services/emailService.js) |
| Glossary “hints” during translation                                                                                                     | **Implemented** (`GET /glossary/hints`, `GET /glossary/hints-for-request/:id`, Translator + Request detail UI)                                  |
| PWA installability (baseline)                                                                                                           | **Partial** — [`frontend/public/manifest.webmanifest`](frontend/public/manifest.webmanifest) + `theme-color`; no service worker / offline cache |
| JWT **refresh** tokens                                                                                                                  | **Not implemented** — single JWT (`JWT_EXPIRES_IN`, default 7d); see §7                                                                         |
| MongoDB / Elasticsearch for versions                                                                                                    | **Not used** — PostgreSQL holds all MVP entities                                                                                                |
| Redis **cache**                                                                                                                         | **Not implemented** — Redis used only for **optional** BullMQ queue (`REDIS_URL` + worker)                                                      |
| Full **translation memory** (TM)                                                                                                        | **Not implemented** — glossary hints only; see §5.5                                                                                             |
| Translator **payouts** (per-word, microtasks)                                                                                           | **Not implemented** — subscriptions only; see §7                                                                                                |
| PayPal / crypto                                                                                                                         | **Not implemented**                                                                                                                             |
| GDPR tooling, audit logs, Sentry, GitHub Actions                                                                                        | **Not in repo** — see §7                                                                                                                        |
| Live **multi-user** collaborative editing (OT/CRDT)                                                                                     | **Not implemented** — Socket.IO used for notifications, not shared editors                                                                      |

---

## 2. Product scope (PRD §1.5) — feature by feature

### 2.1 User signup & role systems (translator, reviewer, consumer)

- **Implementation**
  - **Password sign-up**: `POST /auth/signup` — [`backend/src/routes/auth.js`](backend/src/routes/auth.js). Creates `User` with `UserRole`, `Reputation` row, `emailVerified: false`, stores hashed OTP and expiry, sends email via [`backend/src/services/emailService.js`](backend/src/services/emailService.js) (SMTP when `SMTP_HOST` is set; otherwise logs OTP in dev only).
  - **Verify**: `POST /auth/verify-email`, **resend**: `POST /auth/resend-verification`.
  - **Login**: `POST /auth/login` — rejects unverified password accounts with `403` + `code: EMAIL_NOT_VERIFIED`.
  - **Google OAuth**: `GET /auth/google`, callback — same file; new users get `emailVerified: true`.
  - **Roles**: `CONSUMER` | `TRANSLATOR` | `REVIEWER` | `ADMIN` (admin via `LINGOHUB_ADMIN_EMAILS` in [`backend/src/services/planService.js`](backend/src/services/planService.js)).
- **Frontend**: [`frontend/src/pages/Register.tsx`](frontend/src/pages/Register.tsx), [`frontend/src/pages/VerifyEmail.tsx`](frontend/src/pages/VerifyEmail.tsx), [`frontend/src/context/AuthContext.tsx`](frontend/src/context/AuthContext.tsx), [`frontend/src/components/Protected.tsx`](frontend/src/components/Protected.tsx) (redirect unverified users).

### 2.2 Translation requests (text + simple docs)

- **Text**: `POST /translate` — [`backend/src/routes/translate.js`](backend/src/routes/translate.js). Enforces character caps via [`backend/src/services/planService.js`](backend/src/services/planService.js). Creates `TranslationRequest`, optional AI draft (inline or queued), `Task` TRANSLATE OPEN.
- **Documents**: `POST /documents` (multer) — [`backend/src/routes/documents.js`](backend/src/routes/documents.js); extraction via mammoth/pdf-parse; plan-based MIME/size limits.
- **List / get**: `GET /translate`, `GET /translate/:id` in same router.

### 2.3 AI-generated draft translations

- **Backend** calls **FastAPI** [`ai-service/app/translate.py`](ai-service/app/translate.py) through [`backend/src/services/aiClient.js`](backend/src/services/aiClient.js) (`POST {AI_SERVICE_URL}/translate/draft`).
- **Order**: OpenAI (domain in prompt) → DeepL → mock text if no keys.
- **Optional queue**: If `REDIS_URL` is set, draft for new requests can be filled by [`backend/src/workers/lingoHubWorker.js`](backend/src/workers/lingoHubWorker.js) (BullMQ).

### 2.4 Human edit interface

- **TipTap** editor on job detail — [`frontend/src/pages/RequestDetail.tsx`](frontend/src/pages/RequestDetail.tsx).
- **Submit version**: `POST /versions` — [`backend/src/routes/versions.js`](backend/src/routes/versions.js) (marks translate task done, opens review task, bumps reputation).

### 2.5 Quality scoring & community voting

- **POST /scores** — [`backend/src/routes/scores.js`](backend/src/routes/scores.js). Reviewer/Admin only; request must be in **`REVIEW`** status.
- **One score per reviewer per version**: Prisma `@@unique([versionId, reviewerId])` on `QualityScore`.
- **Displayed score** on `TranslationVersion` is the **average** of all ratings for that version.
- **Workflow**: first successful review still sets request to **APPROVED** and completes review tasks (MVP single gate — not “N reviewers required before approve”).

### 2.6 Reputation & contributor badges

- **Reputation** rows updated in `versions.js` (translator points) and `scores.js` (reviewer points; translator bonus).
- **Badges**: string array on `Reputation` — e.g. `contributor`, `reviewer` on first upsert paths.
- **GET /reputation** — [`backend/src/routes/reputation.js`](backend/src/routes/reputation.js).

### 2.7 Multistage workflow (Draft → Edit → Review → Approve)

- **Statuses** on `TranslationRequest`: `DRAFT`, `IN_PROGRESS`, `REVIEW`, `APPROVED` — see Prisma schema [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).
- **Tasks**: `TRANSLATE` then `REVIEW` — [`backend/src/routes/tasks.js`](backend/src/routes/tasks.js) (list, claim).

### 2.8 Pay-per-task or subscription

- **Implemented**: **Stripe subscription** for Premium — [`backend/src/routes/billing.js`](backend/src/routes/billing.js), webhooks [`backend/src/routes/stripeWebhook.js`](backend/src/routes/stripeWebhook.js), UI [`frontend/src/pages/Pricing.tsx`](frontend/src/pages/Pricing.tsx).
- **Not implemented**: per-task payouts to translators, micro-payments, PayPal, crypto (no business logic or schema for payouts).

### 2.9 API endpoint for translation requests

- **Authenticated app API**: same `/translate` routes as above.
- **External developer API**: `POST /api/translate` with `X-Api-Key` — [`backend/src/routes/developer.js`](backend/src/routes/developer.js) (`createPublicTranslateRouter`), mounted in [`backend/src/index.js`](backend/src/index.js) with **30 req/min** per IP (`apiLimiter`).
- **Keys**: `POST/GET/DELETE /developer/keys`, usage summary `GET /developer/usage`.

### 2.10 Realtime status & notifications

- **Socket.IO** server on same HTTP server as Express — [`backend/src/index.js`](backend/src/index.js).
- **Events emitted** from routes (e.g. `translation:update`, `task:claimed`) and optionally from Redis bridge [`backend/src/realtime/redisBridge.js`](backend/src/realtime/redisBridge.js) when worker completes jobs.
- **Frontend** listens in [`frontend/src/components/Layout.tsx`](frontend/src/components/Layout.tsx) and may refresh task views. This is **notification-style**, not shared live co-editing.

---

## 3. Architecture (SADD §2.1–2.2)

| PRD item                  | Implementation                                                        |
| ------------------------- | --------------------------------------------------------------------- |
| React (Vite) + Tailwind   | [`frontend/`](frontend/)                                              |
| Socket.io client          | `Layout.tsx`                                                          |
| Rich text / versioning UI | TipTap in `RequestDetail.tsx`; version list from API                  |
| Node + Express            | [`backend/src/index.js`](backend/src/index.js)                        |
| PostgreSQL                | Prisma — all core models                                              |
| Redis                     | Optional BullMQ + optional pub/sub bridge — not used as generic cache |
| FastAPI AI service        | [`ai-service/`](ai-service/)                                          |
| Stripe                    | Billing routes + webhooks                                             |
| Social login              | Google OAuth in `auth.js`                                             |
| Email                     | SMTP (Nodemailer) — `emailService.js`                                 |
| Deployment / Sentry / CI  | Not configured in repository                                          |

---

## 4. Database (PRD §3)

All entities from the PRD core MVP are represented in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma): `User`, `TranslationRequest`, `TranslationVersion`, `QualityScore`, `Reputation`, `Glossary`, `Task`, plus `ApiKey`, `PlanTier`, email verification fields, document metadata on requests, etc.

---

## 5. API specification (PRD §4) — mapping

| PRD                   | Actual (primary)             |
| --------------------- | ---------------------------- |
| `POST /auth/signup`   | ✓ (+ verify & resend routes) |
| `POST /auth/login`    | ✓                            |
| `POST /translate`     | ✓ (+ `/translate/preview`)   |
| `GET /translate`      | ✓                            |
| `GET /translate/:id`  | ✓                            |
| `POST /versions`      | ✓                            |
| `GET /versions`       | ✓ (`?requestId=`)            |
| `POST /scores`        | ✓                            |
| `GET /reputation`     | ✓                            |
| `POST /glossary`      | ✓                            |
| `GET /glossary`       | ✓                            |
| `GET /tasks`          | ✓ (`/tasks`)                 |
| `POST /api/translate` | ✓                            |

Additional routes: `/documents`, `/developer/*`, `/billing/*`, `/webhooks/stripe`, `/admin/*`, `/auth/google`, `/auth/verify-email`, `/glossary/hints`, `/glossary/hints-for-request/:requestId`.

---

## 6. Functional requirements (PRD §5)

### 5.1 User onboarding & profiles

- Email + Google + OTP flow — **done** (see §2.1).
- Role selection — Register + Google role query param.
- Reputation — **done**.

### 5.2–5.4 Translation flow, hybrid workflow, quality & reputation

- Covered in §2.2–2.6.

### 5.5 Glossary & translation memory

- **Glossary** CRUD per user — **done**.
- **Hints**: substring match of glossary **source terms** inside source text — **done** (Translator uses logged-in user’s glossary; job detail uses **request owner’s** glossary for staff/owner).
- **Translation memory** (reuse of prior translated segments from past jobs): **not implemented** — would need segment index + similarity search (e.g. Elastic/pg_trgm) and UI; out of MVP scope here.

### 5.6 API for developers

- **done** — keys + plan-based character limit on `/api/translate`.

---

## 7. Security, performance, compliance (PRD §7–8)

| Requirement                 | Status                                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTPS everywhere            | **Deployment concern** — not enforced in app code (use reverse proxy in prod).                                                                       |
| JWT + **refresh**           | **Refresh not implemented** — would need refresh token storage, rotation, and secure delivery (often httpOnly cookies); deferred to keep MVP simple. |
| RBAC                        | Enforced in middleware (`requireAuth`, `requireAdmin`, role checks in routes).                                                                       |
| Rate limiting               | Global + stricter `/api` limiter in `index.js`; auth verify/resend have dedicated limits in `auth.js`.                                               |
| GDPR / privacy / audit logs | **Not implemented** — would need legal policy pages, export/delete flows, immutable audit table, retention; not in current scope.                    |
| Horizontal scaling          | Stateless API + Socket.IO **sticky sessions** / Redis adapter not configured in repo.                                                                |
| Redis caching               | **Not implemented**.                                                                                                                                 |
| Indexed queries             | Prisma indexes where needed (e.g. glossary `ownerId`).                                                                                               |

---

## 8. UX screens (PRD §6) — where they live

| Screen                   | Location                                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                | [`frontend/src/pages/Dashboard.tsx`](frontend/src/pages/Dashboard.tsx)                                                                 |
| Request translation      | [`frontend/src/pages/Translator.tsx`](frontend/src/pages/Translator.tsx)                                                               |
| Translator inbox / tasks | [`frontend/src/pages/Tasks.tsx`](frontend/src/pages/Tasks.tsx)                                                                         |
| Review & score           | [`frontend/src/pages/RequestDetail.tsx`](frontend/src/pages/RequestDetail.tsx)                                                         |
| Glossary                 | [`frontend/src/pages/Glossary.tsx`](frontend/src/pages/Glossary.tsx)                                                                   |
| API console              | [`frontend/src/pages/Developer.tsx`](frontend/src/pages/Developer.tsx)                                                                 |
| Account / pricing        | [`frontend/src/pages/Account.tsx`](frontend/src/pages/Account.tsx), [`frontend/src/pages/Pricing.tsx`](frontend/src/pages/Pricing.tsx) |

---

## 9. PWA (PRD “Web & PWA”)

- **Added**: web app manifest + `theme-color` (install / “Add to Home Screen” baseline on supported browsers).
- **Not added**: `vite-plugin-pwa` service worker, offline shell, or push notifications — would be a separate chunk of work.

---

## 10. Operational notes

- **Environment**: see [`backend/.env.example`](backend/.env.example) (Stripe, SMTP email, JWT, Google, Redis, AI URL, etc.).
- **Prisma**: after pulling schema changes, run `npx prisma db push` or migrations, then `npx prisma generate` (close running Node if Windows reports `EPERM` on the query engine).
- **QualityScore unique constraint**: if migration complains about duplicate `(versionId, reviewerId)` rows, dedupe or accept data loss before applying.

---

## 11. Changelog (this audit)

- **Glossary hints**: `GET /glossary/hints`, `GET /glossary/hints-for-request/:requestId`; UI on Translator and Request detail.
- **Quality scores**: unique reviewer+version; version `score` = average rating; reviews only when request status is `REVIEW`.
- **PWA baseline**: `frontend/public/manifest.webmanifest` + `index.html` links.
- **Documentation**: this file.

If you want the next increment, the highest-value items from the PRD still missing are: **JWT refresh**, **translation memory**, **translator payouts**, and **audit/GDPR** tooling — each is a small product/project on its own.
