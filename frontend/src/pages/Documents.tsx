import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileUp, Loader2 } from "lucide-react";
import { LoadingButton } from "../components/LoadingButton";
import { apiFormData, isApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import { LanguageSelect } from "../components/LanguageSelect";
import { DOMAINS } from "../langs";

export function Documents() {
  const nav = useNavigate();
  const { user, isPremium } = useAuth();
  const [sourceLang, setSourceLang] = useState("EN");
  const [targetLang, setTargetLang] = useState("DE");
  const [domain, setDomain] = useState("general");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !user) return;
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sourceLang", sourceLang);
      fd.append("targetLang", targetLang);
      fd.append("domain", domain);
      const r = await apiFormData<{ request: { id: string } }>("/documents", fd);
      setMsg(`Job created — opening…`);
      setFile(null);
      window.dispatchEvent(
        new CustomEvent("lh:translation", { detail: { requestId: r.request.id } }),
      );
      nav(`/requests/${r.request.id}`);
    } catch (err) {
      if (isApiError(err) && err.status === 408) {
        setMsg(err.message);
      } else {
        setMsg(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-full bg-lh-surface px-4 py-8 md:px-8">
      {busy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 p-6 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="max-w-md rounded-2xl border border-lh-border bg-white p-8 text-center shadow-xl">
            <Loader2 className="mx-auto size-10 animate-spin text-lh-blue" aria-hidden />
            <h2 className="mt-4 text-lg font-bold text-lh-navy">Working on your file…</h2>
            <p className="mt-2 text-sm text-lh-muted leading-relaxed">
              Extracting text from your document and calling the translation service. This can take{" "}
              <strong className="text-lh-ink">one to several minutes</strong> for larger PDFs — please keep this tab
              open.
            </p>
            <p className="mt-3 text-xs text-lh-muted">
              If this hangs past ~15 minutes, your API or hosting timeout may be too low; see deployment docs for
              Render / production timeouts.
            </p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-[720px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-lh-ink">Translate files</h1>
          <p className="text-sm text-lh-muted">
            Upload a .txt, Word, or PDF — we extract the text, translate it with AI, then open the job so you can
            refine it in the editor.
          </p>
        </div>

        <div className="rounded-xl border border-lh-border bg-white p-5 text-sm leading-relaxed text-lh-ink shadow-sm">
          <p className="font-semibold text-lh-navy">What happens after you upload</p>
          <ol className="mt-2 list-decimal list-inside space-y-2 text-lh-muted">
            <li>
              We send you straight to the <strong className="text-lh-ink">job page</strong> for that file (you can
              always open it again from <Link to="/dashboard" className="font-semibold text-lh-blue underline">Dashboard</Link>
              ).
            </li>
            <li>
              On that page, <strong className="text-lh-ink">Source</strong> shows the text we pulled from your
              document.
            </li>
            <li>
              <strong className="text-lh-ink">Human translation (TipTap)</strong> is where the AI translation
              appears — edit there, then submit your version to the workflow.
            </li>
          </ol>
          <p className="mt-3 text-xs text-lh-muted">
            Large PDFs may take a few minutes while we extract and translate; keep this tab open until the upload
            finishes.
          </p>
        </div>

        <div className="rounded-xl border border-lh-border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-lh-ink">Plan limits</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-lh-muted">
            <li>
              <strong className="text-lh-ink">Free:</strong> .txt only, smaller file size, character cap after
              extraction.
            </li>
            <li>
              <strong className="text-lh-ink">Premium:</strong> .txt, .docx, .pdf, larger files, higher character
              limits.
            </li>
          </ul>
          {!isPremium && (
            <Link
              to="/pricing"
              className="mt-3 inline-block text-sm font-semibold text-lh-blue hover:underline"
            >
              Upgrade to Premium
            </Link>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-lh-border bg-white p-6 shadow-sm">
          <div>
            <label className="text-xs font-semibold text-lh-muted">File</label>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-lh-border bg-lh-surface/50 px-4 py-10 hover:bg-lh-surface">
              <FileUp className="size-8 text-lh-muted" />
              <span className="mt-2 text-sm text-lh-muted">
                {file ? file.name : "Click to choose .txt" + (isPremium ? ", .docx, or .pdf" : "")}
              </span>
              <input
                type="file"
                className="hidden"
                accept={isPremium ? ".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" : ".txt,text/plain"}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-lh-muted">Source language</label>
              <LanguageSelect
                variant="source"
                value={sourceLang}
                onChange={setSourceLang}
                className="lh-select mt-1 w-full rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm outline-none ring-lh-blue focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-lh-muted">Target language</label>
              <LanguageSelect
                variant="target"
                value={targetLang}
                onChange={setTargetLang}
                className="lh-select mt-1 w-full rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm outline-none ring-lh-blue focus:ring-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-lh-muted">Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="lh-select mt-1 w-full rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm outline-none ring-lh-blue focus:ring-2"
            >
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {msg && <p className="text-sm text-lh-ink">{msg}</p>}

          <LoadingButton
            type="submit"
            loading={busy}
            loadingLabel="Extracting & translating…"
            disabled={!file}
            className="w-full rounded-lg bg-lh-blue py-3 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
          >
            Upload & start workflow
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}
