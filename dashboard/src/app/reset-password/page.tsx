"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Clicking the emailed reset link lands here with a recovery token in the
  // URL — the browser client picks it up and fires PASSWORD_RECOVERY once a
  // session is established from it. Only then is it safe to call
  // updateUser; calling it before that would just fail with "no session."
  useEffect(() => {
    const supabase = supabaseBrowser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // If the tab already had a session (e.g. link opened while already
    // logged in), the event may have already fired before this listener
    // attached — check directly as a fallback.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = supabaseBrowser();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm"
      >
        <h1 className="mb-1 text-center font-heading text-2xl font-bold">
          <span className="text-brand-green">HOMETOWN</span>
          <span className="text-charcoal">QUOTES</span>
        </h1>
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-body-gray">
          Set New Password
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
            Password updated — signing you in…
          </div>
        )}
        {!ready && !success && (
          <p className="mb-4 text-sm text-body-gray">
            Waiting on the reset link — if you opened this page directly instead of from the email, request a new link.
          </p>
        )}

        <label className="mb-3 block text-sm font-semibold text-charcoal">
          New Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            autoComplete="new-password"
            disabled={!ready}
          />
        </label>

        <label className="mb-6 block text-sm font-semibold text-charcoal">
          Confirm New Password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            autoComplete="new-password"
            disabled={!ready}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !ready}
          className="w-full rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
