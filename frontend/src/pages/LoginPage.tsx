import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { LIMITS } from "../lib/constants";
import { useAuth } from "../hooks/useAuth";
import { ListTodo, ArrowRight, Loader2, Zap, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../lib/errorUtils";

/**
 * Login page with email/code passwordless authentication and a demo mode option.
 * Renders a two-step form: email entry, then six-digit code verification.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = React.useRef<HTMLFormElement>(null);

  /**
   * Starts a temporary demo session using the dev-login endpoint.
   * Bypasses email verification for quick exploration.
   */
  // Auto-submit when all 6 digits are entered (e.g. paste)
  useEffect(() => {
    if (code.length === LIMITS.AUTH_CODE && step === "code" && !loading) {
      formRef.current?.requestSubmit();
    }
  }, [code, step, loading]);

  const handleDevLogin = async () => {
    setShowDemoModal(false);
    setLoading(true);
    try {
      const res = await api.devLogin("dev@functionflow.local");
      login(res.token, res.user, true);
      toast.success("Demo session started!");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sends a verification code to the entered email address.
   * Advances the form to the code-entry step on success.
   * @param e - Form submission event.
   */
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.requestCode(email);
      setStep("code");
      toast.success("Code sent! Check your email.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifies the six-digit code and logs the user in on success.
   * Navigates to the dashboard after a successful login.
   * @param e - Form submission event.
   */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.verifyCode(email, code, rememberMe);
      login(res.token, res.user);
      toast.success("Welcome!");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err));
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-[var(--accent)] mb-2">
            <ListTodo size={32} />
            <span className="text-2xl font-bold">FunctionFlow</span>
          </div>
          <p className="text-[var(--muted)] text-sm">Get things done, beautifully.</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                Continue
              </button>
              <p className="text-xs text-center text-[var(--muted)]">
                We'll send a login code to your email. No password needed.
              </p>
            </form>
          ) : (
            <form ref={formRef} onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Enter verification code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  maxLength={LIMITS.AUTH_CODE}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-center text-2xl font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
                  placeholder="000000"
                />
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Sent to <strong>{email}</strong>
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[var(--border)] accent-[var(--accent)]"
                />
                <span className="text-[var(--muted)]">Remember me for 30 days</span>
              </label>
              <button
                type="submit"
                disabled={loading || code.length < LIMITS.AUTH_CODE}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                Verify
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                className="w-full text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        {/* Dev login — only works when backend runs in Development mode */}
        <div className="mt-4">
          <button
            onClick={() => setShowDemoModal(true)}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
          >
            <Zap size={14} />
            Try Demo (no sign-up required)
          </button>
        </div>
      </div>

      {/* Demo warning modal */}
      {showDemoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={24} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg">Demo Mode</h3>
                <p className="text-sm text-[var(--muted)] mt-1">
                  This creates a temporary session with sample data. All your changes will be{" "}
                  <strong>permanently deleted</strong> when you log out.
                </p>
                <p className="text-sm text-[var(--muted)] mt-2">
                  Want to keep your data? Use a real email address to create a free account.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDemoModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDevLogin}
                disabled={loading}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Start Demo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
