# LingoHub AI

**LingoHub** is a crowdsourced translation platform that combines **AI-generated drafts** with a **human workflow**: translators refine text in-editor, reviewers score quality, and requesters keep a full version history. Subscriptions (Stripe), a developer API, and role-based access round out the MVP.

For deep implementation notes and PRD traceability, see [`IMPLEMENTATION.md`](IMPLEMENTATION.md).

---

## Features

### Authentication & users

- **Email + password** sign-up with **email verification** (SMTP OTP via Nodemailer when configured; dev fallback logs the code).
- **Google OAuth** sign-in.
- **Roles**: Consumer, Translator, Reviewer, and Admin (bootstrap admins via env).
- **Plans**: Free vs Premium with higher text limits and document options (enforced in the API).

### Translation workflow

- **Text jobs**: create requests, optional **live preview** (`/translate/preview`), and **workflow submit** with AI draft (inline or **optional BullMQ worker** when `REDIS_URL` is set).
- **Documents**: upload supported file types (plan-based MIME/size limits), extracted text becomes the source for the same workflow.
- **Dashboard**: lists translation requests **you own** (by account).
- **Tasks inbox**: translators see **TRANSLATE** tasks; reviewers see **REVIEW** tasks after a version is submitted (open/assigned jobs, claim flow).
- **Job detail**: source text, **AI draft**, **TipTap** editor for human versions, version history, glossary hints for the request owner’s terms.
- **Statuses**: `DRAFT` → `IN_PROGRESS` → `REVIEW` → `APPROVED` (see API for allowed transitions).

### AI service

- Separate **FastAPI** app (`ai-service/`): `POST /translate/draft` with optional **`X-Service-Secret`** when `SERVICE_SECRET` is set.
- **Provider order**: OpenAI (with domain context) → DeepL → placeholder text if no keys are configured.
- Node **backend** calls the AI service via `AI_SERVICE_URL` / `AI_SERVICE_SECRET` (see `backend/.env.example`).

### Quality, review & reputation

- **Reviewers** (and admins) submit **1–5 ratings** and optional comments on a translation **version** while the request is in **REVIEW**.
- **Version score** shown in the UI is the **average** of all ratings for that version (one score per reviewer per version).
- Submitting a review **approves** the request and completes the review task (MVP: single review gate).

#### How reputation is calculated

Reputation is stored per user as **`points`** (integer) and **`badges`** (string array). It is **not** derived from a formula over star ratings—only **fixed bonuses** on specific actions:

| Event | Who earns points | Points | Badges (on first reputation row creation for that path) |
|-------|------------------|--------|---------------------------------------------------------|
| Submit a translation version (`POST /versions`) | The submitting user | **+10** | `contributor` |
| Submit a quality score (`POST /scores`) | The reviewer | **+5** | `reviewer` |
| Same score submission | The **translator** who wrote that version | **+15** | *(no new badge in this step)* |

- New users start at **0** points and an empty badge list when the account is created.
- The numeric **rating (1–5)** does **not** change these increments; they are fixed each time a valid score is recorded.

### Glossary

- Per-user **glossary** CRUD.
- **Hints** match glossary source terms inside source text (Translator uses your glossary; job detail can use the **request owner’s** glossary for staff).

### Billing

- **Stripe** Checkout for Premium, webhooks for subscription lifecycle (`/webhooks/stripe`).
- Pricing and plan UI in the frontend.

### Developer API

- **API keys** (`/developer/keys`) and **`POST /api/translate`** with `X-Api-Key`, rate-limited separately from the main app.

### Realtime

- **Socket.IO** for notifications (e.g. translation updates, task claims). With Redis + worker, a **pub/sub bridge** can forward worker events to connected clients.

### Admin

- Admin routes for user/plan management (see `backend/src/routes/admin.js` and `IMPLEMENTATION.md`).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Web app | React (Vite), Tailwind, TipTap, Socket.IO client |
| API | Node.js, Express, Prisma, JWT, Passport (Google) |
| Database | PostgreSQL |
| Optional queue | Redis, BullMQ (`npm run worker` in `backend`) |
| AI | Python, FastAPI (`ai-service/`) |
| Payments | Stripe |

---

## Repository layout

```
backend/       # Express API, Prisma schema, workers
frontend/      # Vite + React SPA
ai-service/    # FastAPI translation microservice
docker-compose.yml   # PostgreSQL + Redis for local dev
```

---

## Quick start (local)

1. **PostgreSQL** (and optionally **Redis**):  
   `docker compose up -d` from the repo root starts Postgres (`5432`) and Redis (`6379`).

2. **Backend**  
   - Copy `backend/.env.example` → `backend/.env` and set `DATABASE_URL`, `JWT_SECRET`, etc.  
   - `cd backend && npm install && npx prisma db push && npm run dev`  
   - Optional: set `REDIS_URL=redis://localhost:6379` and run `npm run worker` in another terminal for async AI drafts.

3. **Frontend**  
   - `cd frontend && npm install && npm run dev` (default Vite port, often `5173`).

4. **AI service**  
   - Copy `ai-service/.env.example` → `ai-service/.env` (API keys, optional `SERVICE_SECRET`).  
   - From repo root: `npm run dev:ai` or `uvicorn app.main:app --reload --port 8000` inside `ai-service/`.

5. **Root helper scripts** (from repo root): `npm run dev:api`, `npm run dev:web`, `npm run dev:ai`, `npm run db:push`.

---

## Documentation

- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** — API mapping, gaps (e.g. no JWT refresh, no translation memory in MVP), security notes, and file references.

---

## License

See the repository’s license file if one is added; otherwise treat usage as defined by the project owner.
