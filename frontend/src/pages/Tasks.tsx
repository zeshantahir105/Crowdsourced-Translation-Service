import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { api } from "../api";

type TaskRow = {
  id: string;
  role: string;
  status: string;
  request: {
    id: string;
    sourceText: string;
    sourceLang: string;
    targetLang: string;
    domain: string;
    status: string;
    aiDraft: string | null;
    owner: { name: string };
  };
};

export function Tasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ tasks: TaskRow[] }>("/tasks");
      setTasks(r.tasks);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("lh:translation", h);
    return () => window.removeEventListener("lh:translation", h);
  }, [load]);

  async function claim(id: string) {
    setBusy(id);
    try {
      await api(`/tasks/${id}/claim`, { method: "POST" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-full bg-lh-surface px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[900px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-lh-ink">Translator & reviewer inbox</h1>
          <p className="text-sm text-lh-muted">Claim open tasks aligned with your role</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-lh-muted">
            <Loader2 className="size-5 animate-spin" />
            Loading tasks…
          </div>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}

        <ul className="space-y-3">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-lh-border bg-white p-4 shadow-sm md:flex md:items-start md:justify-between"
            >
              <div className="min-w-0">
                <span className="inline-block rounded-md bg-lh-surface px-2 py-0.5 text-xs font-bold uppercase text-lh-blue">
                  {t.role}
                </span>
                <p className="mt-2 line-clamp-3 text-sm text-lh-ink">{t.request.sourceText}</p>
                <p className="mt-1 text-xs text-lh-muted">
                  {t.request.sourceLang} → {t.request.targetLang} · {t.request.domain} · Requester:{" "}
                  {t.request.owner.name}
                </p>
                {t.request.aiDraft && (
                  <p className="mt-2 rounded-lg bg-lh-surface p-2 text-xs text-lh-muted">
                    <span className="font-semibold text-lh-ink">AI draft: </span>
                    {t.request.aiDraft.slice(0, 200)}
                    {t.request.aiDraft.length > 200 ? "…" : ""}
                  </p>
                )}
              </div>
              <div className="mt-3 flex shrink-0 flex-col gap-2 md:mt-0 md:ms-4">
                <Link
                  to={`/requests/${t.request.id}`}
                  className="rounded-lg bg-lh-blue px-4 py-2 text-center text-sm font-semibold text-white hover:bg-lh-blue-hover"
                >
                  Open job
                </Link>
                {t.status === "OPEN" && (
                  <button
                    type="button"
                    disabled={busy === t.id}
                    onClick={() => claim(t.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-lh-border px-4 py-2 text-sm font-semibold hover:bg-lh-surface disabled:opacity-50"
                  >
                    {busy === t.id ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                    Claim
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {!loading && tasks.length === 0 && (
          <p className="text-center text-sm text-lh-muted">No open tasks — check back after new requests.</p>
        )}
      </div>
    </div>
  );
}
