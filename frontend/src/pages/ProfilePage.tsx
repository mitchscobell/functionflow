import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorUtils";
import type { ApiKey } from "../types";
import Layout from "../components/Layout";
import {
  Save,
  Loader2,
  Mail,
  Key,
  Plus,
  Copy,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

/**
 * User profile settings page. Allows editing display name and theme preference,
 * and manages personal API keys (create, revoke, copy).
 */
export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  useEffect(() => {
    if (user) setDisplayName(user.displayName);
  }, [user]);

  useEffect(() => {
    api
      .getApiKeys()
      .then(setApiKeys)
      .catch(() => {});
  }, []);

  /**
   * Persists the display name and theme preference to the server.
   * @param e - Form submission event.
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        displayName,
        themePreference: theme,
      });
      updateUser(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Creates a new API key with the entered name.
   * Displays the raw key value once for the user to copy.
   */
  const handleCreateKey = async () => {
    const name = newKeyName.trim();
    if (!name) return;
    setCreatingKey(true);
    try {
      const res = await api.createApiKey(name);
      setNewKeyValue(res.key);
      setNewKeyName("");
      const keys = await api.getApiKeys();
      setApiKeys(keys);
      toast.success("API key created");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreatingKey(false);
    }
  };

  /**
   * Revokes an API key so it can no longer be used.
   * @param id - Database ID of the key to revoke.
   */
  const handleRevokeKey = async (id: number) => {
    try {
      await api.revokeApiKey(id);
      setApiKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, isRevoked: true } : k)),
      );
      toast.success("API key revoked");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  /**
   * Copies the given text to the system clipboard and shows a toast.
   * @param text - The string to copy.
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  /** Available theme options with color swatches for visual preview. */
  const themes = [
    {
      value: "function" as const,
      label: "Function",
      desc: "Warm terracotta tones",
      swatches: ["#B67B5E", "#FEF9EF", "#6B8F71"],
    },
    {
      value: "dark" as const,
      label: "Dark",
      desc: "Easy on the eyes",
      swatches: ["#818CF8", "#0F1117", "#4ADE80"],
    },
    {
      value: "light" as const,
      label: "Light",
      desc: "Clean and bright",
      swatches: ["#2563EB", "#FAFAFA", "#16A34A"],
    },
    {
      value: "vaporwave" as const,
      label: "Vaporwave",
      desc: "Retro neon nostalgia",
      swatches: ["#FF6AD5", "#1A1025", "#01CDFE"],
    },
    {
      value: "cyberpunk" as const,
      label: "Cyberpunk",
      desc: "Electric neon edge",
      swatches: ["#00F0FF", "#0A0A12", "#FF2A6D"],
    },
  ];

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-[var(--muted)]">
              <Mail size={16} />
              {user?.email}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
              placeholder="How should we call you?"
            />
          </div>

          {/* Theme Picker */}
          <div>
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {themes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    theme === t.value
                      ? "border-[var(--accent)] bg-[var(--hover)]"
                      : "border-[var(--border)] hover:border-[var(--muted)]"
                  }`}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {t.desc}
                  </div>
                  <div className="mt-2 flex gap-1">
                    {t.swatches.map((color, i) => (
                      <span
                        key={i}
                        className="h-3 w-3 rounded-full border border-[var(--border)]"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        </form>

        {/* API Keys Section */}
        <div className="mt-10 border-t border-[var(--border)] pt-8">
          <div className="flex items-center gap-2 mb-4">
            <Key size={20} />
            <h2 className="text-xl font-bold">API Keys</h2>
          </div>
          <p className="text-sm text-[var(--muted)] mb-3">
            Generate personal API keys to access the FunctionFlow REST API from
            scripts, automations, or tools like Postman. Include your key in the{" "}
            <code className="text-xs bg-[var(--hover)] px-1 py-0.5 rounded">
              X-Api-Key
            </code>{" "}
            header with each request.
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            <a
              href="/swagger"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--hover)] transition-colors"
            >
              <ExternalLink size={14} />
              API Docs (Swagger)
            </a>
            <a
              href="/swagger/v1/swagger.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--hover)] transition-colors"
            >
              <ExternalLink size={14} />
              Download OpenAPI Spec
            </a>
          </div>
          <p className="text-xs text-[var(--muted)] mb-4">
            Tip: Import the OpenAPI spec into{" "}
            <span className="font-medium">Postman</span>,{" "}
            <span className="font-medium">Insomnia</span>, or any HTTP client to
            get pre-built requests for every endpoint.
          </p>

          {/* New key form */}
          <div className="flex gap-2 mb-4">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. My Script)"
              maxLength={100}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
            />
            <button
              onClick={handleCreateKey}
              disabled={creatingKey || !newKeyName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {creatingKey ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Create
            </button>
          </div>

          {/* Newly created key warning */}
          {newKeyValue && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                <AlertTriangle size={16} />
                <span className="text-sm font-medium">
                  Copy your API key now — it won't be shown again!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-[var(--bg)] px-3 py-2 text-xs font-mono break-all border border-[var(--border)]">
                  {newKeyValue}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyValue)}
                  className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors"
                  title="Copy"
                >
                  <Copy size={16} />
                </button>
              </div>
              <button
                onClick={() => setNewKeyValue(null)}
                className="mt-2 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Existing keys */}
          {apiKeys.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-4">
              No API keys yet. Create one above.
            </p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center justify-between rounded-lg border border-[var(--border)] p-3 ${
                    key.isRevoked ? "opacity-50" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{key.name}</span>
                      {key.isRevoked && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                      <code>{key.keyPrefix}...</code>
                      <span>
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {!key.isRevoked && (
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Version & Health */}
        <div className="mt-8 border-t border-[var(--border)] pt-6 text-center">
          <a
            href="/version"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <Info size={14} />
            Version & Health
          </a>
        </div>
      </div>
    </Layout>
  );
}
