import { useState, useEffect } from "react";
import { ListTodo, ExternalLink, Heart, Database, Server } from "lucide-react";

/**
 * Response shape from the `/api/version` health-check endpoint.
 */
interface ApiHealth {
  /** Application name. */
  name: string;

  /** Semantic version string of the backend. */
  version: string;

  /** Server health status (e.g. "healthy"). */
  status: string;

  /** Database connectivity status. */
  database: string;

  /** ISO 8601 timestamp of the health check. */
  timestamp: string;
}

/**
 * Public page that displays the frontend and backend version numbers,
 * API health status, and database connectivity.
 */
export default function VersionPage() {
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [apiError, setApiError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/version")
      .then((res) => {
        if (!res.ok) throw new Error("API unreachable");
        return res.json();
      })
      .then((data) => {
        setApiHealth(data);
        setApiError(false);
      })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false));
  }, []);

  /**
   * Small colored dot indicating healthy (green) or unhealthy (red) status.
   * @param props.healthy - Whether the service is healthy.
   */
  const StatusDot = ({ healthy }: { healthy: boolean }) => (
    <span
      className={`inline-block h-3 w-3 rounded-full ${healthy ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"}`}
    />
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-[var(--accent)] mb-2">
            <ListTodo size={28} />
            <span className="text-2xl font-bold">FunctionFlow</span>
          </div>
          <p className="text-[var(--muted)] text-sm">Version & Health</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-5">
          {/* Version */}
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Frontend
            </span>
            <p className="text-lg font-semibold mt-0.5">v1.0.0</p>
          </div>

          <hr className="border-[var(--border)]" />

          {/* API Health */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <Server size={16} />
              API Status
            </h3>
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Checking...</p>
            ) : apiError ? (
              <div className="flex items-center gap-2 text-sm">
                <StatusDot healthy={false} />
                <span className="text-red-500">API unreachable</span>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Status</span>
                  <span className="flex items-center gap-2">
                    <StatusDot healthy={apiHealth?.status === "healthy"} />
                    {apiHealth?.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Version</span>
                  <span>v{apiHealth?.version}</span>
                </div>
              </div>
            )}
          </div>

          <hr className="border-[var(--border)]" />

          {/* Database Health */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <Database size={16} />
              Database
            </h3>
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Checking...</p>
            ) : apiError ? (
              <div className="flex items-center gap-2 text-sm">
                <StatusDot healthy={false} />
                <span className="text-red-500">Unknown</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Connection</span>
                <span className="flex items-center gap-2">
                  <StatusDot healthy={apiHealth?.database === "connected"} />
                  {apiHealth?.database}
                </span>
              </div>
            )}
          </div>

          <hr className="border-[var(--border)]" />

          {/* Credits */}
          <div className="text-center text-sm text-[var(--muted)]">
            <p className="flex items-center justify-center gap-1">
              Made with <Heart size={14} className="text-red-500" /> by
            </p>
            <a
              href="https://mitchscobell.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 font-medium text-[var(--accent)] hover:underline"
            >
              Mitch Scobell
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
