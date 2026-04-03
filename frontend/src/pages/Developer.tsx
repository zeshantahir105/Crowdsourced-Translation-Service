import { useCallback, useEffect, useState } from "react";
import { Key, Loader2, Trash2 } from "lucide-react";
import { LoadingButton } from "../components/LoadingButton";
import { api } from "../api";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export function Developer() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [usage, setUsage] = useState<{ apiKeys: number; translationRequests: number } | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("Production");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, u] = await Promise.all([
        api<{ keys: KeyRow[] }>("/developer/keys"),
        api<{ apiKeys: number; translationRequests: number }>("/developer/usage"),
      ]);
      setKeys(k.keys);
      setUsage(u);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createKey() {
    setBusy(true);
    setNewKey(null);
    try {
      const r = await api<{ apiKey: string; warning?: string }>("/developer/keys", {
        method: "POST",
        json: { name },
      });
      setNewKey(r.apiKey);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    setDeletingId(id);
    try {
      await api(`/developer/keys/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  const apiBase = import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <div className="min-h-full bg-lh-surface px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[800px] space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-lh-ink">API console</h1>
          <p className="text-sm text-lh-muted">Keys for programmatic translation (`POST /api/translate`)</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-lh-muted">
            <Loader2 className="size-5 animate-spin" />
            Loading…
          </div>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}

        {usage && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-lh-border bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-lh-muted">API keys</p>
              <p className="text-2xl font-bold text-lh-ink">{usage.apiKeys}</p>
            </div>
            <div className="rounded-xl border border-lh-border bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-lh-muted">Your translation requests</p>
              <p className="text-2xl font-bold text-lh-ink">{usage.translationRequests}</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-lh-border bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-lh-ink">Create key</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-lh-border px-3 py-2 text-sm"
            placeholder="Key label"
          />
          <LoadingButton
            type="button"
            loading={busy}
            loadingLabel="Generating…"
            onClick={createKey}
            className="rounded-lg bg-lh-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
          >
            <Key className="size-4" />
            Generate API key
          </LoadingButton>
          {newKey && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm">
              <p className="font-semibold text-amber-900">Copy now — shown once:</p>
              <code className="mt-2 block break-all font-mono text-xs text-lh-ink">{newKey}</code>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-lh-border bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-lh-ink">Example request</h2>
          <pre className="overflow-x-auto rounded-lg bg-lh-surface p-4 text-xs leading-relaxed">
            {`curl -X POST ${apiBase || "http://localhost:4000"}/api/translate \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_KEY_HERE" \\
  -d '{"text":"Hello","source_lang":"EN","target_lang":"DE"}'`}
          </pre>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-lh-ink">Your keys</h2>
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-xl border border-lh-border bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="font-medium text-lh-ink">{k.name}</p>
                  <p className="font-mono text-xs text-lh-muted">{k.keyPrefix}…</p>
                </div>
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => del(k.id)}
                  className="rounded-lg p-2 text-lh-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="Revoke"
                >
                  {deletingId === k.id ? (
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
    </div>
  );
}
