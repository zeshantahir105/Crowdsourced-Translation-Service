import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  BookOpen,
  Copy,
  Eraser,
  FileText,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { LanguageSelect } from "../components/LanguageSelect";
import { DOMAINS } from "../langs";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const FREE_CHAR_LIMIT = 5000;
const PREMIUM_CHAR_LIMIT = 100000;

type GlossaryHint = {
  id: string;
  sourceTerm: string;
  translatedTerm: string;
  context: string | null;
};

export function Translator() {
  const { user, isPremium } = useAuth();
  const charLimit = isPremium ? PREMIUM_CHAR_LIMIT : FREE_CHAR_LIMIT;
  const [sourceLang, setSourceLang] = useState("EN");
  const [targetLang, setTargetLang] = useState("DE");
  const [domain, setDomain] = useState("general");
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [glossaryHints, setGlossaryHints] = useState<GlossaryHint[]>([]);

  const debounced = useDebounced(sourceText, 600);

  const runPreview = useCallback(async () => {
    if (!user || !debounced.trim()) {
      if (!debounced.trim()) setTargetText("");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const r = await api<{ translated_text: string }>("/translate/preview", {
        method: "POST",
        json: {
          sourceText: debounced,
          sourceLang,
          targetLang,
          domain,
        },
      });
      setTargetText(r.translated_text);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  }, [user, debounced, sourceLang, targetLang, domain]);

  useEffect(() => {
    runPreview();
  }, [runPreview]);

  useEffect(() => {
    if (!user || !debounced.trim()) {
      setGlossaryHints([]);
      return;
    }
    let cancelled = false;
    api<{ hints: GlossaryHint[] }>(
      `/glossary/hints?text=${encodeURIComponent(debounced.slice(0, 50_000))}`
    )
      .then((r) => {
        if (!cancelled) setGlossaryHints(r.hints || []);
      })
      .catch(() => {
        if (!cancelled) setGlossaryHints([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, debounced]);

  function swapLangs() {
    const nextSource = targetLang;
    let nextTarget = sourceLang === "AUTO" ? "EN" : sourceLang;
    if (nextSource === nextTarget) {
      nextTarget = nextSource === "EN" ? "DE" : "EN";
    }
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
    setSourceText(targetText);
    setTargetText(sourceText);
  }

  async function submitWorkflow() {
    if (!user) return;
    setSubmitting(true);
    setMsg("");
    try {
      await api("/translate", {
        method: "POST",
        json: {
          sourceText,
          sourceLang,
          targetLang,
          domain,
          // Same neural output the user already saw in preview (backend may use it if server AI fails).
          clientDraft: targetText.trim() || undefined,
        },
      });
      setMsg("Submitted to LingoHub workflow — check Dashboard & Tasks.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = sourceText.length;

  return (
    <div className="min-h-full bg-lh-surface">
      <div className="border-b border-lh-border bg-white px-4 py-3 md:px-8">
        <div className="h-1 w-full max-w-[1400px] rounded-full bg-gradient-to-r from-lh-cyan via-lh-blue to-lh-navy mx-auto mb-3 opacity-90" />
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-lh-navy md:text-xl">Translator</h1>
            <p className="text-sm text-lh-muted">
              Neural draft · crowdsourced refinement · quality scoring
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="lh-select rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm font-medium outline-none ring-lh-blue focus:ring-2"
            >
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-lh-border px-3 py-2 text-sm font-medium text-lh-blue hover:bg-lh-surface"
            >
              <FileText className="size-4" />
              <span className="hidden sm:inline">Translate files</span>
            </Link>
            <Link
              to="/pricing"
              className={`hidden rounded-lg px-3 py-2 text-xs font-bold sm:inline-block ${
                isPremium ? "bg-amber-100 text-amber-900" : "bg-lh-surface text-lh-muted"
              }`}
            >
              {isPremium ? "Premium" : "Free — upgrade"}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
        {!user && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-semibold">Sign in</span> for AI drafts and to submit jobs to the community
            workflow.{" "}
            <Link className="font-semibold text-lh-blue underline" to="/login">
              Log in
            </Link>
          </div>
        )}

        {user && !isPremium && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-lh-border bg-white px-4 py-3 text-sm text-lh-ink shadow-sm">
            <span>
              You are on the <strong>Free</strong> plan (text limits, .txt documents only).{" "}
              <Link className="font-semibold text-lh-blue underline" to="/pricing">
                View Premium
              </Link>
            </span>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2 md:gap-3">
          <LanguageSelect
            variant="source"
            value={sourceLang}
            onChange={setSourceLang}
            className="lh-select min-w-[140px] rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm font-semibold shadow-sm outline-none ring-lh-blue focus:ring-2"
          />

          <button
            type="button"
            onClick={swapLangs}
            className="rounded-full border border-lh-border bg-white p-2 text-lh-muted shadow-sm hover:bg-lh-surface hover:text-lh-blue"
            aria-label="Swap languages"
          >
            <ArrowLeftRight className="size-5" />
          </button>

          <LanguageSelect
            variant="target"
            value={targetLang}
            onChange={setTargetLang}
            className="lh-select min-w-[140px] rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm font-semibold shadow-sm outline-none ring-lh-blue focus:ring-2"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-0 lg:rounded-xl lg:border lg:border-lh-border lg:bg-white lg:shadow-sm">
          <div className="flex min-h-[320px] flex-col rounded-xl border border-lh-border bg-white shadow-sm lg:rounded-none lg:border-0 lg:shadow-none">
            <div className="relative flex-1 p-4 pb-16">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Enter text to translate — suggestions update as you type."
                className="h-full min-h-[240px] w-full resize-none border-0 bg-transparent text-base leading-relaxed text-lh-ink outline-none placeholder:text-lh-muted/70"
                spellCheck
              />
            </div>
            <div className="flex h-14 items-center gap-2 border-t border-lh-border px-4">
              <span className="text-xs text-lh-muted">
                {charCount.toLocaleString()} / {charLimit.toLocaleString()} chars ({isPremium ? "Premium" : "Free"})
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => {
                  setSourceText("");
                  setTargetText("");
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-lh-muted hover:bg-lh-surface"
              >
                <Eraser className="size-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="flex min-h-[320px] flex-col rounded-xl border border-lh-border bg-white shadow-sm lg:rounded-none lg:border-0 lg:border-s lg:border-lh-border lg:shadow-none">
            <div className="relative flex-1 p-4 pb-16">
              {loading && (
                <div className="absolute end-4 top-4 flex items-center gap-2 text-sm text-lh-muted">
                  <Loader2 className="size-4 animate-spin" />
                  Translating…
                </div>
              )}
              <textarea
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                placeholder={user ? "Translation appears here." : "Sign in to see AI output."}
                className="h-full min-h-[240px] w-full resize-none border-0 bg-transparent text-base leading-relaxed text-lh-ink outline-none placeholder:text-lh-muted/70"
                readOnly={!user}
                maxLength={user ? charLimit : undefined}
              />
            </div>
            <div className="flex h-14 flex-wrap items-center gap-2 border-t border-lh-border px-4">
              <button
                type="button"
                onClick={() => targetText && navigator.clipboard.writeText(targetText)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-lh-muted hover:bg-lh-surface"
              >
                <Copy className="size-4" />
                Copy
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={runPreview}
                disabled={!user || !sourceText.trim() || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-lh-surface px-3 py-2 text-sm font-semibold text-lh-blue hover:bg-lh-border/50 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "Updating…" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={submitWorkflow}
                disabled={!user || !sourceText.trim() || submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-lh-blue to-lh-navy px-4 py-2 text-sm font-semibold text-white shadow-md shadow-lh-blue/20 transition hover:brightness-110 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
                {submitting ? "Submitting…" : "Send to workflow"}
              </button>
            </div>
          </div>
        </div>

        {user && glossaryHints.length > 0 && (
          <div className="mt-4 rounded-xl border border-lh-border bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-lh-ink">
              <BookOpen className="size-4 text-lh-blue" />
              Glossary matches in your text
            </div>
            <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
              {glossaryHints.map((h) => (
                <li key={h.id} className="rounded-lg bg-lh-surface/80 px-3 py-2">
                  <span className="font-medium text-lh-ink">{h.sourceTerm}</span>
                  <span className="text-lh-muted"> → </span>
                  <span className="text-lh-ink">{h.translatedTerm}</span>
                  {h.context && (
                    <p className="mt-0.5 text-xs text-lh-muted line-clamp-2">{h.context}</p>
                  )}
                </li>
              ))}
            </ul>
            <Link to="/glossary" className="mt-2 inline-block text-xs font-semibold text-lh-blue hover:underline">
              Manage glossary
            </Link>
          </div>
        )}

        {msg && (
          <p className="mt-4 rounded-lg border border-lh-border bg-white px-4 py-3 text-sm text-lh-ink">{msg}</p>
        )}
      </div>
    </div>
  );
}
