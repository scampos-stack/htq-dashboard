"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Email is required.");
      return;
    }

    setLoading(true);
    const supabase = supabaseBrowser();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    // Always show the same success message regardless of whether the email
    // is registered — confirming/denying an account's existence here would
    // let anyone probe which addresses have accounts.
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
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
          Reset Password
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {sent ? (
          <p className="mb-4 rounded-lg bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
            If an account exists for that email, a reset link is on its way — check your inbox.
          </p>
        ) : (
          <>
            <label className="mb-6 block text-sm font-semibold text-charcoal">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hometownquotes.com"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                autoComplete="email"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </>
        )}

        <p className="mt-4 text-center text-xs text-body-gray">
          <Link href="/login" className="font-semibold text-charcoal underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
