import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api";

type Row = {
  id: string;
  email: string;
  name: string;
  role: string;
  planTier: string;
  subscriptionExpiresAt: string | null;
  createdAt: string;
};

const ROLES = ["CONSUMER", "TRANSLATOR", "REVIEWER", "ADMIN"];
const PLANS = ["FREE", "PREMIUM"];

export function AdminUsers() {
  const [users, setUsers] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ users: Row[] }>("/admin/users");
      setUsers(r.users);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: { role?: string; planTier?: string }) {
    setSaving(id);
    try {
      await api(`/admin/users/${id}`, { method: "PATCH", json: body });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-h-full bg-lh-surface px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold text-lh-ink">Admin — users</h1>
        <p className="text-sm text-lh-muted">Assign roles and plans for production operations.</p>
        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="overflow-x-auto rounded-xl border border-lh-border bg-white shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-lh-border bg-lh-surface text-xs font-bold uppercase text-lh-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lh-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-lh-ink">{u.name}</div>
                    <div className="text-xs text-lh-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {saving === u.id && <Loader2 className="size-3.5 shrink-0 animate-spin text-lh-muted" aria-hidden />}
                      <select
                      value={u.role}
                      disabled={saving === u.id}
                      onChange={(e) => patch(u.id, { role: e.target.value })}
                      className="lh-select lh-select-sm min-w-0 flex-1 rounded-lg border border-lh-border bg-white py-1.5 ps-2.5 pe-9 text-xs outline-none ring-lh-blue focus:ring-1"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.planTier}
                      disabled={saving === u.id}
                      onChange={(e) => patch(u.id, { planTier: e.target.value })}
                      className="lh-select lh-select-sm rounded-lg border border-lh-border bg-white py-1.5 ps-2.5 pe-9 text-xs outline-none ring-lh-blue focus:ring-1"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-lh-muted">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
