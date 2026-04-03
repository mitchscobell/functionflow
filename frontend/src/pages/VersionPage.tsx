import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ListTodo, ExternalLink, Heart, Database, Server, ArrowLeft } from "lucide-react";

/**
 * Response shape from the `/api/version` health-check endpoint.
 */
type ApiHealth = Awaited<ReturnType<typeof api.getVersion>>;

/**
 * Small colored dot indicating healthy (green) or unhealthy (red) status.
 * @param props.healthy - Whether the service is healthy.
 */
function StatusDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${healthy ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"}`}
    />
  );
}

/**
 * Public page that displays the frontend and backend version numbers,
 * API health status, and database connectivity.
 */
export default function VersionPage() {
  const navigate = useNavigate();
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [apiError, setApiError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getVersion()
      .then((data) => {
        setApiHealth(data);
        setApiError(false);
      })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
            title="Go back"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
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
            <p className="text-lg font-semibold mt-0.5">v{__APP_VERSION__}</p>
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
            <a
              href="https://github.com/mitchscobell/functionflow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 98 96"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                />
              </svg>
              <span className="text-xs">View on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
