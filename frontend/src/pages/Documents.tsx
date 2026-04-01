import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileUp, Loader2 } from "lucide-react";
import { apiFormData } from "../api";
import { useAuth } from "../context/AuthContext";
import { DOMAINS, LANGUAGES } from "../langs";

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
      window.dispatchEvent(new CustomEvent("lh:translation"));
      nav(`/requests/${r.request.id}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-lh-surface px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[720px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-lh-ink">Translate files</h1>
          <p className="text-sm text-lh-muted">
            Upload a document — we extract text, run AI draft, and open a LingoHub workflow (like DeepL files).
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
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="lh-select mt-1 w-full rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm outline-none ring-lh-blue focus:ring-2"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-lh-muted">Target language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="lh-select mt-1 w-full rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm outline-none ring-lh-blue focus:ring-2"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
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

          <button
            type="submit"
            disabled={!file || busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-lh-blue py-3 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Upload & start workflow
          </button>
        </form>
      </div>
    </div>
  );
}
