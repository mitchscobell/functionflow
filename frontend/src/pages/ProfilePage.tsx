import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import { Save, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setDisplayName(user.displayName);
  }, [user]);

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
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    {
      value: "function" as const,
      label: "Function",
      desc: "Warm terracotta tones",
    },
    { value: "dark" as const, label: "Dark", desc: "Easy on the eyes" },
    { value: "light" as const, label: "Light", desc: "Clean and bright" },
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
            <div className="grid grid-cols-3 gap-3">
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
                  {/* Preview swatch */}
                  <div className="mt-2 flex gap-1">
                    {t.value === "function" && (
                      <>
                        <span className="h-3 w-3 rounded-full bg-[#B67B5E]" />
                        <span className="h-3 w-3 rounded-full bg-[#FEF9EF]" />
                        <span className="h-3 w-3 rounded-full bg-[#6B8F71]" />
                      </>
                    )}
                    {t.value === "dark" && (
                      <>
                        <span className="h-3 w-3 rounded-full bg-[#818CF8]" />
                        <span className="h-3 w-3 rounded-full bg-[#0F1117]" />
                        <span className="h-3 w-3 rounded-full bg-[#4ADE80]" />
                      </>
                    )}
                    {t.value === "light" && (
                      <>
                        <span className="h-3 w-3 rounded-full bg-[#2563EB]" />
                        <span className="h-3 w-3 rounded-full bg-[#FAFAFA] border border-gray-200" />
                        <span className="h-3 w-3 rounded-full bg-[#16A34A]" />
                      </>
                    )}
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
      </div>
    </Layout>
  );
}
