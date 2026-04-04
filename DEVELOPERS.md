# LingoHub — developer guide

Setup, architecture, configuration, and deployment for engineers working on this repository.

| Doc | Audience |
|-----|----------|
| **[README.md](README.md)** | Product overview and feature summary |
| **[FEATURES_AND_USAGE.md](FEATURES_AND_USAGE.md)** | End-user guide (non-technical) |
| **[IMPLEMENTATION.md](IMPLEMENTATION.md)** | PRD traceability, API mapping, security notes, known gaps |
| **This file** | Local dev, env vars, services, production deployment |

---

## Architecture

```text
Browser (Vite SPA) ──HTTPS──► Express API (Prisma + PostgreSQL)
                    │              │
                    │              ├──► FastAPI ai-service (OpenAI → DeepL → fallback)
                    │              ├──► Stripe webhooks / billing
                    │              └──► Optional: Redis + BullMQ worker (draft retries)
                    └── Socket.IO client ◄──► Socket.IO on API (optional Redis pub/sub from worker)
```

- **Monolithic API** (`backend/src/index.js`): REST routes, JWT auth, multer uploads, Socket.IO attachment.
- **AI translation** is delegated to **`ai-service/`** (`POST /translate/draft`); long text is chunked in `translate.py`.
- **Public developer API**: `POST /api/translate` with `X-Api-Key` (separate rate limiter).

---

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | Express, Prisma schema & migrations, `npm run worker` |
| `frontend/` | React + Vite + Tailwind + TipTap |
| `ai-service/` | FastAPI app (`app/main.py`, `app/translate.py`) |
| `docker-compose.yml` | Local PostgreSQL + Redis |
| `backend/src/constants/translationUserMessages.js` | User-facing failure copy + `isTranslationServiceFailureText()` |
| `backend/src/services/aiClient.js` | HTTP client to AI service (`AI_DRAFT_TIMEOUT_MS`, default 10 min) |

---

## Prerequisites

- **Node.js** 18+ (for `fetch`, `AbortSignal.timeout` patterns used in backend)
- **Python** 3.12+ recommended for `ai-service`
- **PostgreSQL** 14+
- **Redis** — optional (only for BullMQ retry queue)

---

## Local development

### 1. Database (and optional Redis)

From repo root:

```bash
docker compose up -d
```

Postgres default: `localhost:5432`, Redis `localhost:6379` (see `docker-compose.yml`).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, FRONTEND_URL, AI_SERVICE_URL, etc.
npm install
npx prisma migrate deploy   # or prisma db push for quick dev
npm run dev
```

Default API: `http://localhost:4000` (or `PORT` in `.env`).

### 3. AI service

```bash
cd ai-service
cp .env.example .env
# Set OPENAI_API_KEY and/or DEEPL_API_KEY; optional SERVICE_SECRET
pip install -r requirements.txt   # or use your venv
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend must reach this URL (`AI_SERVICE_URL`). If `SERVICE_SECRET` is set in AI `.env`, set the same value in backend `AI_SERVICE_SECRET` (sent as `X-Service-Secret`).

### 4. Frontend

```bash
cd frontend
cp .env.example .env   # if present
# VITE_API_URL=http://localhost:4000  (no trailing slash)
# Optional: VITE_SOCKET_URL=http://localhost:4000
npm install
npm run dev
```

### 5. Optional worker (BullMQ)

Only needed if `REDIS_URL` is set on the backend. Retries **failed** AI drafts (jobs where inline draft is a known failure message).

```bash
cd backend
npm run worker
```

### Root npm scripts

From repo root (if defined in root `package.json`): `npm run dev:api`, `npm run dev:web`, `npm run dev:ai`, `npm run db:push`.

---

## Environment variables (summary)

### Backend (`backend/.env`)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Auth tokens |
| `CLIENT_ORIGIN` | Comma-separated browser origins (CORS); no trailing slash |
| `FRONTEND_URL` | OAuth return / links to SPA |
| `GOOGLE_*` | OAuth web client + callback URL |
| `SMTP_*`, `EMAIL_FROM`, `OTP_PEPPER` | Email OTP / verification (required for password flows in prod) |
| `AI_SERVICE_URL`, `AI_SERVICE_SECRET` | AI microservice |
| `FREE_MAX_TEXT_CHARS`, `PREMIUM_MAX_TEXT_CHARS` | Plan limits |
| `LINGOHUB_ADMIN_EMAILS` | Comma-separated → `ADMIN` on first signup |
| `STRIPE_*` | Checkout + webhooks + `STRIPE_PRICE_PREMIUM` |
| `REDIS_URL` | Optional; enables queue + worker + pub/sub bridge |

Full comments: **`backend/.env.example`**.

### AI service (`ai-service/.env`)

| Variable | Notes |
|----------|--------|
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Primary LLM path |
| `DEEPL_API_KEY`, `DEEPL_USE_PRO` | Fallback MT |
| `SERVICE_SECRET` | Must match backend `AI_SERVICE_SECRET` if set |
| `CORS_ORIGINS` | Usually `*` in dev |

See **`ai-service/.env.example`**.

### Frontend (`frontend/.env`)

| Variable | Notes |
|----------|--------|
| `VITE_API_URL` | Backend origin, **no** trailing slash (required in production hosting) |
| `VITE_SOCKET_URL` | Same host as API for Socket.IO; omit to disable client socket |

---

## How translation is triggered

- **`POST /translate/preview`** — always calls AI inline (authenticated).
- **`POST /translate`** (text job) — **inline** `fetchDraftTranslation` before insert; if `REDIS_URL` is set **and** draft is a failure placeholder, enqueues **retry** job.
- **`POST /documents`** — same pattern: inline draft on upload; optional enqueue on failure only.

So **no worker is required** for happy-path drafts.

---

## Key HTTP routes (app session, unless noted)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup`, `/auth/login`, … | Auth |
| POST | `/translate/preview` | Live preview |
| POST | `/translate` | Create text request |
| POST | `/documents` | Multipart file upload |
| GET | `/translate`, `/translate/:id` | List / detail |
| POST | `/versions` | Submit human version |
| POST | `/scores` | Reviewer score |
| GET/POST | `/glossary`, `/glossary/hints` | Glossary |
| GET | `/tasks` | Translator/reviewer inbox |
| GET | `/plans/limits` | **Public** JSON — Free/Premium `maxTextChars`, `maxDocBytes`, `allowedDocExtensions` (for UI; matches enforcement) |
| POST | `/api/translate` | **Public** API (`X-Api-Key`) |

Full mapping: **`IMPLEMENTATION.md` §5**.

---

## Database

```bash
cd backend
npx prisma migrate deploy    # production / CI
npx prisma studio            # GUI
```

Schema: **`backend/prisma/schema.prisma`**.

---

## Production deployment (e.g. Render)

Minimum **three** deployables for full functionality:

1. **Backend** — `cd backend && npm run build && npm start` (or platform equivalent). Set all required env vars; **`AI_SERVICE_URL`** must be the **public** URL of the AI service (not `localhost`).
2. **AI service** — e.g. `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set provider keys and optional `SERVICE_SECRET`.
3. **Frontend** — static build; **`VITE_API_URL`** at build time must point to the deployed API.

### Worker on Render?

**Usually omit** `REDIS_URL` and skip the worker: drafts are generated inline.

If you **set `REDIS_URL`**, add a **Background Worker** service: root `backend`, start command `npm run worker`, same env as API (at least `DATABASE_URL`, `REDIS_URL`, `AI_SERVICE_URL`).

### Timeouts

Document upload + chunked translation can exceed **30–60s**. Increase platform/proxy **idle/read timeouts**. Frontend `apiFormData` uses a **15-minute** client timeout for uploads.

---

## Troubleshooting (engineering)

| Issue | Checks |
|-------|--------|
| CORS errors | `CLIENT_ORIGIN` must include exact SPA origin(s); comma-separated |
| AI always “service not working” | AI service up? Keys set? Backend can reach `AI_SERVICE_URL` from **server** network? |
| OAuth redirect mismatch | `GOOGLE_CALLBACK_URL` and Google Console authorized URIs |
| Stripe webhook | Raw body on `POST /webhooks/stripe`; `STRIPE_WEBHOOK_SECRET` matches Dashboard / CLI forward |
| Prisma EPERM (Windows) | Stop Node processes locking query engine; retry `prisma generate` |

---

## Code style & tests

- Match existing patterns in each package; no test suite is required by this doc—add tests per feature as your team prefers.

---

## License

See repository root license if present; otherwise per project owner.
