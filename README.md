# LingoHub AI

**LingoHub** is a crowdsourced translation platform that combines **AI-generated drafts** with a **human workflow**: translators refine text in-editor, reviewers score quality, and requesters keep a full version history. Subscriptions (Stripe), a developer API, and role-based access round out the MVP.

---

## Documentation

| Document | Who it’s for |
|----------|----------------|
| **[DEVELOPERS.md](DEVELOPERS.md)** | **Engineers** — local setup, env vars, architecture, deployment (Render, worker, AI service). |
| **[FEATURES_AND_USAGE.md](FEATURES_AND_USAGE.md)** | **End users** — how to use Translator, files, dashboard, jobs, tasks, glossary, billing. |
| **[IMPLEMENTATION.md](IMPLEMENTATION.md)** | **Product / tech leads** — PRD traceability, API list, security notes, known gaps. |

---

## Features (summary)

### Authentication & users

- **Email + password** sign-up with **email verification** (SMTP via Nodemailer when configured).
- **Google OAuth** sign-in.
- **Roles**: Consumer, Translator, Reviewer, and Admin (bootstrap admins via env).
- **Plans**: Free vs Premium with higher text limits and document options (enforced in the API).

### Translation workflow

- **Text jobs**: live preview and workflow submit with **inline AI draft** by default; optional **Redis + BullMQ worker** for **retries** when the draft fails.
- **Documents**: upload plan-limited file types; extracted text feeds the same workflow.
- **Dashboard**, **Tasks**, **Job detail** (TipTap, versions, review), status progression **DRAFT → IN_PROGRESS → REVIEW → APPROVED**.

### AI service

- **FastAPI** app (`ai-service/`): OpenAI (domain context) → DeepL → configurable fallback messaging.
- Node backend calls it via `AI_SERVICE_URL` / `AI_SERVICE_SECRET`.

### Other

- **Stripe** Checkout for Premium; **Socket.IO** for lightweight realtime hints; **Glossary** with hints; **Developer API** (`POST /api/translate` with API key); **Admin** routes.

---

## Repository layout

```
backend/       # Express API, Prisma, optional worker
frontend/      # Vite + React SPA
ai-service/    # FastAPI translation microservice
docker-compose.yml   # PostgreSQL + Redis for local dev
```

---

## Quick links

- **Run the stack locally** → [DEVELOPERS.md — Local development](DEVELOPERS.md#local-development)
- **Deploy (e.g. Render)** → [DEVELOPERS.md — Production deployment](DEVELOPERS.md#production-deployment-eg-render)
- **Environment variables** → [DEVELOPERS.md — Environment variables](DEVELOPERS.md#environment-variables-summary)

---

## License

See the repository’s license file if one is added; otherwise treat usage as defined by the project owner.
