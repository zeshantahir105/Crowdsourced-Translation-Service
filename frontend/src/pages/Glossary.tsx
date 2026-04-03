import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { LoadingButton } from "../components/LoadingButton";
import { api } from "../api";

type Entry = {
  id: string;
  sourceTerm: string;
  translatedTerm: string;
  context: string | null;
};

export function Glossary() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [sourceTerm, setSourceTerm] = useState("");
  const [translatedTerm, setTranslatedTerm] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ entries: Entry[] }>(`/glossary${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setEntries(r.entries);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/glossary", {
        method: "POST",
        json: { sourceTerm, translatedTerm, context: context || undefined },
      });
      setSourceTerm("");
      setTranslatedTerm("");
      setContext("");
      await load();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Add failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await api(`/glossary/${id}`, { method: "DELETE" });
      await load();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-full bg-lh-surface px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[800px] space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-lh-ink">Glossary</h1>
          <p className="text-sm text-lh-muted">Consistent terms for you and your team (MVP: personal)</p>
        </div>

        <form onSubmit={add} className="rounded-xl border border-lh-border bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-lh-ink">Add term</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Source term"
              value={sourceTerm}
              onChange={(e) => setSourceTerm(e.target.value)}
              className="rounded-lg border border-lh-border px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Translation"
              value={translatedTerm}
              onChange={(e) => setTranslatedTerm(e.target.value)}
              className="rounded-lg border border-lh-border px-3 py-2 text-sm"
            />
          </div>
          <input
            placeholder="Context (optional)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full rounded-lg border border-lh-border px-3 py-2 text-sm"
          />
          <LoadingButton
            type="submit"
            loading={saving}
            loadingLabel="Saving…"
            className="rounded-lg bg-lh-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
          >
            <Plus className="size-4" />
            Save term
          </LoadingButton>
        </form>

        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search glossary…"
            className="w-full rounded-lg border border-lh-border bg-white px-3 py-2 text-sm shadow-sm"
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-lh-muted">
            <Loader2 className="size-5 animate-spin" />
            Loading…
          </div>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}

        <ul className="space-y-2">
          {entries.map((en) => (
            <li
              key={en.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-lh-border bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-lh-ink">
                  {en.sourceTerm} → {en.translatedTerm}
                </p>
                {en.context && <p className="mt-1 text-sm text-lh-muted">{en.context}</p>}
              </div>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => remove(en.id)}
                className="rounded-lg p-2 text-lh-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Delete"
              >
                {deletingId === en.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
