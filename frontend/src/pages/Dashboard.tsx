import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, FileStack, TrendingUp } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

type RequestRow = {
  id: string;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  domain: string;
  status: string;
  inputKind?: string;
  createdAt: string;
};

export function Dashboard() {
  const { user, reputation } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<{ requests: RequestRow[] }>("/translate");
      setRequests(r.requests);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
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

  const approved = requests.filter((x) => x.status === "APPROVED").length;
  const inFlight = requests.filter((x) => x.status !== "APPROVED").length;

  return (
    <div className="min-h-full bg-lh-surface px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1200px] space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-lh-ink">Dashboard</h1>
          <p className="text-sm text-lh-muted">Overview of your translation activity</p>
        </div>

        <div className="rounded-xl border border-lh-border bg-white p-4 shadow-sm md:p-6">
          <h2 className="text-sm font-semibold text-lh-muted">Your profile</h2>
          <p className="mt-1 text-sm text-lh-ink">
            <span className="font-semibold capitalize">{user?.role.toLowerCase().replace("_", " ")}</span>
            {" · "}
            <span className={user?.planTier === "PREMIUM" ? "font-semibold text-amber-700" : ""}>
              {user?.planTier === "PREMIUM" ? "Premium" : "Free"}
            </span>
          </p>
          <p className="mt-2 text-sm text-lh-muted">
            Roles are set at registration.{" "}
            <Link className="font-semibold text-lh-blue hover:underline" to="/account">
              Account
            </Link>{" "}
            shows your plan. To change role or plan,{" "}
            {user?.role === "ADMIN" ? (
              <>
                use{" "}
                <Link className="font-semibold text-lh-blue hover:underline" to="/admin">
                  Admin
                </Link>
                .
              </>
            ) : (
              "contact an administrator."
            )}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={FileStack} label="Total requests" value={requests.length} />
          <Stat icon={Clock} label="In progress" value={inFlight} />
          <Stat icon={CheckCircle2} label="Approved" value={approved} />
          <Stat icon={TrendingUp} label="Reputation" value={reputation?.points ?? 0} />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="overflow-hidden rounded-xl border border-lh-border bg-white shadow-sm">
          <div className="border-b border-lh-border px-4 py-3">
            <h2 className="font-semibold text-lh-ink">Recent translation requests</h2>
          </div>
          <ul className="divide-y divide-lh-border">
            {requests.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-lh-muted">
                No requests yet — start in the{" "}
                <Link className="font-semibold text-lh-blue hover:underline" to="/translator">
                  Translator
                </Link>{" "}
                or{" "}
                <Link className="font-semibold text-lh-blue hover:underline" to="/documents">
                  Documents
                </Link>
                .
              </li>
            )}
            {requests.map((req) => (
              <li
                key={req.id}
                className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-lh-ink">{req.sourceText.slice(0, 120)}…</p>
                  <p className="text-xs text-lh-muted">
                    {req.sourceLang} → {req.targetLang} · {req.domain} ·{" "}
                    {req.inputKind === "DOCUMENT" && (
                      <span className="font-semibold text-lh-blue">document · </span>
                    )}
                    <span className="font-semibold capitalize">{req.status.toLowerCase().replace("_", " ")}</span>
                  </p>
                </div>
                <Link
                  className="shrink-0 text-sm font-semibold text-lh-blue hover:underline"
                  to={`/requests/${req.id}`}
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-lh-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-lh-surface p-2 text-lh-blue">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-lh-muted">{label}</p>
          <p className="text-2xl font-bold text-lh-ink">{value}</p>
        </div>
      </div>
    </div>
  );
}
