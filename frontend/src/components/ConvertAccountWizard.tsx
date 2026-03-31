import { useState } from "react";
import { api } from "../lib/api";
import { getErrorMessage } from "../lib/errorUtils";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Mail,
  Sparkles,
  ShieldCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

/** Wizard steps for the demo-to-permanent account conversion flow. */
type Step = "intro" | "email" | "code" | "success";

/**
 * Multi-step wizard that guides demo users through converting their
 * temporary account into a permanent one by verifying an email address.
 *
 * @param props.onClose - Callback to dismiss the wizard overlay.
 */
export default function ConvertAccountWizard({
  onClose,
}: {
  onClose: () => void;
}) {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Sends a verification code to the entered email address.
   * Advances to the code-entry step on success.
   * @param e - Form submission event.
   */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.convertDemo(email);
      setStep("code");
      toast.success("Code sent! Check your email.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifies the email code and completes the account conversion.
   * Logs the user in with a permanent session on success.
   * @param e - Form submission event.
   */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.verifyConversion(email, code);
      login(res.token, res.user, false);
      setStep("success");
      toast.success("Account converted!");
    } catch (err) {
      setError(getErrorMessage(err));
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Sparkles size={20} />
            <h2 className="text-lg font-semibold">Keep Your Account</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--hover)] transition-colors text-[var(--muted)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-6 pt-4">
          {(["intro", "email", "code", "success"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= ["intro", "email", "code", "success"].indexOf(step)
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          {step === "intro" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[var(--hover)] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    className="text-[var(--accent)] shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Convert your demo into a permanent account
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      All your tasks, lists, and settings will be preserved.
                      You'll sign in with your email going forward.
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-sm text-[var(--muted)] space-y-2">
                <p>Here's what happens:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Enter your real email address</li>
                  <li>Verify with a 6-digit code</li>
                  <li>Your demo becomes a real account — instantly</li>
                </ol>
              </div>
              <button
                onClick={() => setStep("email")}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Get Started
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <Mail size={14} className="inline mr-1.5 -mt-0.5" />
                  Your email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
                  placeholder="you@example.com"
                />
                <p className="mt-1.5 text-xs text-[var(--muted)]">
                  We'll send a verification code to confirm it's yours.
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("intro");
                    setError("");
                  }}
                  className="flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[var(--hover)] transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                  Send Code
                </button>
              </div>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Enter verification code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  autoFocus
                  maxLength={6}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-center text-2xl font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
                  placeholder="000000"
                />
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Sent to <strong>{email}</strong>
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                  className="flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[var(--hover)] transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                  Verify & Convert
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mx-auto">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">You're all set!</h3>
                <p className="text-sm text-[var(--muted)] mt-1">
                  Your account is now permanent. Sign in anytime with{" "}
                  <strong>{email}</strong>.
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
