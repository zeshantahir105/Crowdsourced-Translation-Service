import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Globe2,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const M = {
  translateCube: "/images/marketing/translate-cube.svg",
  heroIllustration: "/images/marketing/hero-documents-illustration.svg",
  partnerAlza: "/images/marketing/partner-alza.svg",
  partnerWeglot: "/images/marketing/partner-weglot.svg",
} as const;

const FEATURES = [
  {
    title: "AI drafts, instantly",
    body: "Neural previews for pasted text and extracted document content. Pick domain context so tone and terminology match legal, medical, marketing, and more.",
    icon: Sparkles,
    bar: "from-lh-cyan to-sky-500",
    iconWrap: "bg-gradient-to-br from-cyan-50 to-sky-100 text-lh-blue ring-cyan-200/60",
  },
  {
    title: "Crowdsourced refinement",
    body: "Submit jobs to a shared pool: translators improve the draft in-editor, reviewers score quality, and you keep a full version history per request.",
    icon: Users,
    bar: "from-violet-500 to-indigo-600",
    iconWrap: "bg-gradient-to-br from-violet-50 to-indigo-100 text-indigo-700 ring-violet-200/60",
  },
  {
    title: "Documents, not just snippets",
    body: "Upload supported formats—we extract text for translation and workflow tracking. Free and Premium tiers differ by size and file types.",
    icon: FileText,
    bar: "from-emerald-500 to-teal-600",
    iconWrap: "bg-gradient-to-br from-emerald-50 to-teal-100 text-teal-800 ring-emerald-200/60",
  },
  {
    title: "Glossaries & consistency",
    body: "Maintain term bases so product names and regulated phrases stay aligned across languages and contributors.",
    icon: BookOpen,
    bar: "from-amber-500 to-orange-500",
    iconWrap: "bg-gradient-to-br from-amber-50 to-orange-100 text-amber-900 ring-amber-200/60",
  },
  {
    title: "Many languages, one hub",
    body: "Switch source and target pairs from a single translator UI; the same pipeline powers dashboard tracking and API experiments.",
    icon: Globe2,
    bar: "from-blue-500 to-lh-blue",
    iconWrap: "bg-gradient-to-br from-blue-50 to-sky-100 text-lh-blue ring-blue-200/60",
  },
  {
    title: "Roles & admin control",
    body: "Separate sign-up paths for consumers, translators, and reviewers. Administrators manage users and plans from a dedicated panel.",
    icon: ShieldCheck,
    bar: "from-rose-500 to-pink-600",
    iconWrap: "bg-gradient-to-br from-rose-50 to-pink-100 text-rose-800 ring-rose-200/60",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Draft",
    body: "Paste text or upload a document. AI produces a first-pass translation with domain-aware prompting.",
    icon: Zap,
    ring: "ring-cyan-400/50 bg-gradient-to-br from-cyan-100 to-sky-50 text-lh-navy",
  },
  {
    step: "2",
    title: "Refine",
    body: "Optional: send the job to the task queue so vetted translators edit in context.",
    icon: Layers,
    ring: "ring-violet-400/50 bg-gradient-to-br from-violet-100 to-indigo-50 text-lh-navy",
  },
  {
    step: "3",
    title: "Review",
    body: "Reviewers rate versions and leave structured feedback so quality trends stay visible.",
    icon: CheckCircle2,
    ring: "ring-emerald-400/50 bg-gradient-to-br from-emerald-100 to-teal-50 text-lh-navy",
  },
  {
    step: "4",
    title: "Ship",
    body: "Track everything on your dashboard, copy final text, or integrate via the API console.",
    icon: ArrowRight,
    ring: "ring-amber-400/50 bg-gradient-to-br from-amber-100 to-orange-50 text-lh-navy",
  },
] as const;

export function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-full bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-lh-border lh-hero-mesh">
        <div
          className="pointer-events-none absolute -start-20 top-20 size-72 rounded-full bg-lh-cyan/25 blur-3xl lh-blob"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -end-16 bottom-10 size-80 rounded-full bg-lh-blue/20 blur-3xl lh-blob-delay"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute start-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-200/30 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1200px] px-4 py-12 md:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(260px,440px)] lg:gap-14">
            <div className="text-center lg:text-start">
              <div className="mb-4 flex justify-center lg:justify-start">
                <span className="inline-flex items-center gap-2 rounded-full border border-lh-cyan/30 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-lh-navy shadow-sm backdrop-blur-sm">
                  <span className="size-2 animate-pulse rounded-full bg-lh-cyan" aria-hidden />
                  LingoHub AI
                </span>
              </div>
              <h1 className="mx-auto max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight lg:mx-0 md:text-5xl md:leading-[1.08]">
                <span className="lh-gradient-text">Translation</span>
                <span className="text-lh-navy"> that blends neural speed with </span>
                <span className="text-lh-blue">human judgment</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-lh-muted md:text-lg lg:mx-0">
                Get instant AI drafts for text and documents, then route work to professional translators and
                reviewers. One platform for individuals, teams, and localization workflows.
              </p>

              <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-3 lg:mx-0 lg:justify-start">
                <div className="lh-stat-shimmer rounded-xl border border-cyan-200/60 px-4 py-2 text-center shadow-sm">
                  <div className="text-lg font-black text-lh-navy md:text-xl">100+</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-lh-muted">Language pairs</div>
                </div>
                <div className="rounded-xl border border-lh-border bg-white/90 px-4 py-2 text-center shadow-sm backdrop-blur-sm">
                  <div className="text-lg font-black text-lh-blue md:text-xl">AI + Human</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-lh-muted">Workflow</div>
                </div>
                <div className="rounded-xl border border-lh-border bg-white/90 px-4 py-2 text-center shadow-sm backdrop-blur-sm">
                  <div className="text-lg font-black text-teal-700 md:text-xl">Docs</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-lh-muted">TXT · DOCX · PDF</div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link
                  to="/translator"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-lh-blue to-lh-navy px-6 py-3 text-sm font-bold text-white shadow-lg shadow-lh-blue/25 transition hover:shadow-xl hover:shadow-lh-blue/30 hover:brightness-110"
                >
                  Open translator
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {!user && (
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-lh-cyan/40 bg-white px-6 py-3 text-sm font-bold text-lh-navy shadow-sm transition hover:border-lh-cyan hover:bg-lh-cyan-soft"
                  >
                    Create account
                  </Link>
                )}
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-lh-blue transition hover:text-lh-cyan"
                >
                  Compare plans
                </Link>
              </div>
            </div>

            <div className="group relative mx-auto w-full max-w-[400px] lg:max-w-none">
              <div className="relative rounded-3xl bg-gradient-to-br from-white via-cyan-50/40 to-sky-100/50 p-4 shadow-xl ring-1 ring-lh-cyan/20 transition-shadow duration-500 group-hover:shadow-2xl group-hover:ring-lh-cyan/35">
                <img
                  src={M.heroIllustration}
                  alt=""
                  className="mx-auto w-full max-h-[min(48vh,380px)] object-contain object-center transition duration-700 ease-out group-hover:scale-[1.03] lg:max-h-[420px]"
                  width={600}
                  height={600}
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div
                className="absolute bottom-2 start-4 rounded-2xl bg-white p-3 shadow-lg ring-2 ring-lh-cyan/30 backdrop-blur-sm md:start-6 md:p-4 lh-animate-float"
                aria-hidden
              >
                <img
                  src={M.translateCube}
                  alt=""
                  className="h-12 w-auto drop-shadow-md transition duration-300 group-hover:scale-110 md:h-16"
                  width={72}
                  height={60}
                  loading="eager"
                />
              </div>
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-lh-border/80 bg-white/60 px-4 py-8 shadow-inner backdrop-blur-sm md:px-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-lh-muted">
              Works in the same ecosystem as leading localization tools
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
              <img
                src={M.partnerAlza}
                alt="Alza"
                className="h-8 w-auto max-w-[120px] object-contain opacity-70 grayscale transition duration-300 hover:scale-105 hover:opacity-100 hover:grayscale-0 md:h-9"
                loading="lazy"
                decoding="async"
              />
              <img
                src={M.partnerWeglot}
                alt="Weglot"
                className="h-7 w-auto max-w-[140px] object-contain opacity-70 grayscale transition duration-300 hover:scale-105 hover:opacity-100 hover:grayscale-0 md:h-8"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative mx-auto max-w-[1200px] px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-x-0 -top-12 h-24 bg-gradient-to-b from-lh-cyan-soft/50 to-transparent" />
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-lh-navy md:text-4xl">
          Built for real workflows
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-lh-muted md:text-lg">
          LingoHub connects machine translation, task queues, glossaries, and quality review—so your output stays
          consistent and accountable.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const FIcon = f.icon;
            return (
              <article
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-lh-border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-lh-cyan/30 hover:shadow-xl"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90 ${f.bar}`}
                  aria-hidden
                />
                <div
                  className={`mb-4 inline-flex rounded-xl p-3 shadow-sm ring-2 transition group-hover:scale-105 ${f.iconWrap}`}
                >
                  <FIcon className="size-6" aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-lh-navy">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-lh-muted">{f.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-y border-lh-border bg-gradient-to-b from-slate-50 via-white to-cyan-50/30 py-14 md:py-20">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <h2 className="text-2xl font-extrabold tracking-tight text-lh-navy md:text-4xl">How LingoHub works</h2>
              <p className="mt-3 text-lh-muted md:text-lg">
                From first keystroke to reviewed delivery—transparent steps you can explain to stakeholders.
              </p>
            </div>
            <ol className="grid flex-1 gap-6 sm:grid-cols-2">
              {STEPS.map(({ step, title, body, icon: StepIcon, ring }) => (
                <li
                  key={step}
                  className="group relative rounded-2xl border border-lh-border bg-white/90 p-5 shadow-md backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <span className="absolute end-4 top-4 text-3xl font-black text-lh-border/80">{step}</span>
                  <div
                    className={`inline-flex size-11 items-center justify-center rounded-xl ring-2 ${ring} shadow-sm transition group-hover:scale-105`}
                  >
                    <StepIcon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-3 font-bold text-lh-navy">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-lh-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Plans teaser */}
      <section className="mx-auto max-w-[1200px] px-4 py-14 md:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lh-navy-deep via-lh-blue to-lh-navy px-6 py-10 text-white shadow-2xl md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute -end-20 -top-20 size-64 rounded-full bg-lh-cyan/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 start-1/4 size-48 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold md:text-3xl">Free to start. Premium when you need more.</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
                Free includes core translator limits and lighter document support. Premium unlocks higher character
                ceilings, larger uploads, and broader file formats.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-white/90">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-lh-cyan" />
                  Stripe checkout for subscriptions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-lh-cyan" />
                  Plan changes reflected on your account after webhook confirmation
                </li>
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-center text-sm font-bold text-lh-blue shadow-lg transition hover:bg-lh-cyan-soft hover:shadow-xl"
              >
                View pricing
              </Link>
              <Link
                to="/translator"
                className="inline-flex items-center justify-center rounded-xl border-2 border-lh-cyan/60 px-8 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Try the translator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="border-t border-lh-border bg-gradient-to-b from-white to-lh-surface py-14 md:py-20">
        <div className="mx-auto max-w-[1200px] px-4">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-lh-navy md:text-4xl">
            Who uses LingoHub
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-lh-muted md:text-lg">
            Choose your role at registration (or when you sign in with Google). Each path gets the tools that match
            the job.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {(
              [
                {
                  title: "Consumers",
                  body: "Translate text and files, manage requests on the dashboard, and upgrade when limits matter.",
                  accent: "from-cyan-500 to-lh-blue",
                },
                {
                  title: "Translators",
                  body: "Claim tasks, edit in a rich editor, submit versions, and build reputation from completed work.",
                  accent: "from-violet-500 to-indigo-600",
                },
                {
                  title: "Reviewers",
                  body: "Score submissions and guide quality so the community output stays predictable and auditable.",
                  accent: "from-emerald-500 to-teal-600",
                },
              ] as const
            ).map((r) => (
              <div
                key={r.title}
                className="group relative overflow-hidden rounded-2xl border border-lh-border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90 ${r.accent}`}
                  aria-hidden
                />
                <h3 className="font-bold text-lh-navy">{r.title}</h3>
                <p className="mt-2 text-sm text-lh-muted">{r.body}</p>
              </div>
            ))}
          </div>
          {!user && (
            <p className="mt-8 text-center text-sm text-lh-muted">
              Ready to join?{" "}
              <Link to="/register" className="font-semibold text-lh-blue hover:text-lh-cyan hover:underline">
                Create an account
              </Link>{" "}
              and pick your role.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
