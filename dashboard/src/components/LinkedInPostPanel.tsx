"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LINKEDIN_ACCOUNTS } from "@/lib/data";

export function LinkedInPostPanel({ draftId }: { draftId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [account, setAccount] = useState<string>(LINKEDIN_ACCOUNTS[2]);
  const [scheduledDate, setScheduledDate] = useState("");

  async function handleOpen() {
    setOpen(true);
    setSaved(false);
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/broadcast-drafts/${draftId}/linkedin-post`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to generate post");
      setContent(data.content);
      setImageUrl(data.imageUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate post");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(status: "draft" | "approved") {
    if (!content.trim()) {
      setError("Post content can't be empty.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/linkedin-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcastDraftId: draftId,
          content,
          imageUrl,
          account,
          status,
          scheduledDate: scheduledDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to save post");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-charcoal/5"
      >
        Turn into LinkedIn Post
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-black/10 bg-charcoal/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wide text-body-gray">LinkedIn Post</h4>
        <button onClick={() => setOpen(false)} className="text-xs font-semibold text-body-gray underline">
          Close
        </button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {generating ? (
        <p className="text-sm text-body-gray">Generating…</p>
      ) : saved ? (
        <p className="text-sm font-semibold text-brand-green-dark">
          ✓ Saved to the LinkedIn queue. View it on the{" "}
          <a href="/linkedin-posts" className="underline">
            LinkedIn Queue
          </a>{" "}
          page.
        </p>
      ) : (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[180px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
          />
          <p className="mt-1 text-[11px] text-body-gray">{content.length} characters</p>

          {imageUrl ? (
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-semibold text-body-gray">
                Image reused from the email (clear to post without one):
              </p>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-20 w-auto rounded border border-black/10" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="text-xs font-semibold text-body-gray underline"
                >
                  Remove image
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-body-gray">No image found in the email to reuse.</p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-body-gray">
              Post from
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
              >
                {LINKEDIN_ACCOUNTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-body-gray">
              Target post date (optional)
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleSave("approved")}
              disabled={saving}
              className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : "Looks good — add to queue"}
            </button>
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-charcoal/5 disabled:opacity-60"
            >
              Save as draft
            </button>
          </div>
        </>
      )}
    </div>
  );
}
