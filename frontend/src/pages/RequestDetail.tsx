import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ArrowLeft, BookOpen, Loader2, Send } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

type Version = {
  id: string;
  text: string;
  score: number | null;
  createdAt: string;
  translator: { id: string; name: string };
};

type GlossaryHint = {
  id: string;
  sourceTerm: string;
  translatedTerm: string;
  context: string | null;
};

type RequestDetail = {
  id: string;
  inputKind?: string;
  attachmentOriginalName?: string | null;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  domain: string;
  status: string;
  aiDraft: string | null;
  ownerId: string;
  versions: Version[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** TipTap-friendly HTML from extracted / MT plain text (paragraphs + line breaks). */
function plainTranslationToHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "<p></p>";
  const blocks = trimmed.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const inner = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p>${inner || "<br>"}</p>`;
    })
    .join("");
}

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<RequestDetail | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [glossaryHints, setGlossaryHints] = useState<GlossaryHint[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api<{ request: RequestDetail }>(`/translate/${id}`);
      setData(r.request);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onTranslation = (e: Event) => {
      const ce = e as CustomEvent<{ requestId?: string }>;
      const rid = ce.detail?.requestId;
      if (rid === undefined || rid === id) load();
    };
    window.addEventListener("lh:translation", onTranslation);
    return () => window.removeEventListener("lh:translation", onTranslation);
  }, [id, load]);

  useEffect(() => {
    if (!id || !user || !data?.sourceText?.trim()) {
      setGlossaryHints([]);
      return;
    }
    let cancelled = false;
    api<{ hints: GlossaryHint[] }>(`/glossary/hints-for-request/${id}`)
      .then((r) => {
        if (!cancelled) setGlossaryHints(r.hints || []);
      })
      .catch(() => {
        if (!cancelled) setGlossaryHints([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user, data?.id, data?.sourceText]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write or refine the translation (TipTap editor)…",
      }),
    ],
    content: "<p></p>",
  });

  const seedText = data?.versions[0]?.text || data?.aiDraft || "";
  const seedVersionId = data?.versions[0]?.id;

  useEffect(() => {
    if (!editor || !data) return;
    // Prefer latest human version over stored AI draft so a good submission isn't hidden
    // behind a stale "[AI unavailable]…" placeholder saved at job creation time.
    const raw = seedText;
    if (!raw.trim()) {
      editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
      return;
    }
    editor.commands.setContent(plainTranslationToHtml(raw), false);
  }, [editor, data?.id, seedVersionId, seedText]);

  async function submitVersion() {
    if (!editor || !id || !user) return;
    const text = editor.getText();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api("/versions", {
        method: "POST",
        json: { requestId: id, text },
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const latestVersion = data?.versions[0];

  async function submitReview() {
    if (!latestVersion) return;
    setReviewBusy(true);
    try {
      await api("/scores", {
        method: "POST",
        json: {
          versionId: latestVersion.id,
          rating: reviewRating,
          comments: reviewComment || undefined,
        },
      });
      setReviewComment("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Review failed");
    } finally {
      setReviewBusy(false);
    }
  }

  const canEditTranslation = Boolean(
    user &&
      data &&
      (user.id === data.ownerId || ["TRANSLATOR", "ADMIN"].includes(user.role)),
  );
  const canReview = user && ["REVIEWER", "ADMIN"].includes(user.role);

  if (!data && !err) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-lh-muted">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (err && !data) {
    return (
      <div className="p-8 text-center text-red-600">
        {err}{" "}
        <Link className="text-lh-blue underline" to="/dashboard">
          Back
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-full bg-lh-surface px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[900px] space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-lh-blue hover:underline"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>

        <div className="rounded-xl border border-lh-border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-lh-ink">Job detail</h1>
            <span className="rounded-md bg-lh-surface px-2 py-0.5 text-xs font-bold uppercase text-lh-muted">
              {data.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-lh-muted">
            {data.sourceLang} → {data.targetLang} · {data.domain}
            {data.inputKind === "DOCUMENT" && data.attachmentOriginalName && (
              <span className="ms-2 font-semibold text-lh-blue">
                · Document: {data.attachmentOriginalName}
              </span>
            )}
          </p>

          <div className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wide text-lh-muted">Source</h2>
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-lh-surface p-4 text-sm leading-relaxed">
              {data.sourceText}
            </p>
          </div>

          {glossaryHints.length > 0 && (
            <div className="mt-4 rounded-lg border border-lh-border bg-amber-50/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-lh-ink">
                <BookOpen className="size-4 text-amber-700" />
                Requester glossary matches
              </div>
              <ul className="space-y-2 text-sm">
                {glossaryHints.map((h) => (
                  <li key={h.id} className="rounded-md bg-white/80 px-3 py-2">
                    <span className="font-medium">{h.sourceTerm}</span>
                    <span className="text-lh-muted"> → </span>
                    <span>{h.translatedTerm}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.aiDraft && (
            <div className="mt-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-lh-muted">AI draft</h2>
              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-dashed border-lh-border p-4 text-sm">
                {data.aiDraft}
              </p>
            </div>
          )}
        </div>

        {canEditTranslation && (
          <div className="rounded-xl border border-lh-border bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-lh-ink">Human translation (TipTap)</h2>
            <p className="mt-1 text-sm text-lh-muted">
              {user?.id === data.ownerId
                ? "Your AI draft is loaded here — edit and submit to send the job to review."
                : "Submit a version to move the job to review."}
            </p>
            <div className="prose prose-sm mt-4 max-w-none rounded-lg border border-lh-border p-3">
              {editor && <EditorContent editor={editor} />}
            </div>
            <button
              type="button"
              onClick={submitVersion}
              disabled={saving}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-lh-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {saving ? "Saving…" : "Submit version"}
            </button>
          </div>
        )}

        {data.versions.length > 0 && (
          <div className="rounded-xl border border-lh-border bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-lh-ink">Versions</h2>
            <ul className="mt-3 space-y-3">
              {data.versions.map((v) => (
                <li key={v.id} className="rounded-lg border border-lh-border p-3 text-sm">
                  <p className="text-xs text-lh-muted">
                    {v.translator.name} · {new Date(v.createdAt).toLocaleString()}
                    {v.score != null && <span className="ms-2 font-semibold">Score: {v.score}</span>}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{v.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canReview && latestVersion && data.status === "REVIEW" && (
          <div className="rounded-xl border border-lh-border bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-lh-ink">Quality review</h2>
            <p className="mt-1 text-sm text-lh-muted">Rate the latest version (1–5).</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="text-sm font-medium">
                Rating
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="lh-select lh-select-sm ms-2 rounded-lg border border-lh-border bg-white py-1.5 ps-2.5 pe-9 text-sm outline-none ring-lh-blue focus:ring-2"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Optional comments"
              className="mt-3 w-full rounded-lg border border-lh-border p-3 text-sm"
              rows={3}
            />
            <button
              type="button"
              onClick={submitReview}
              disabled={reviewBusy}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-lh-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
            >
              {reviewBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              {reviewBusy ? "Submitting…" : "Submit review"}
            </button>
          </div>
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
