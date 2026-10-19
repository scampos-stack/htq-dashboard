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
  const [feedback, setFeedback] = useState("");

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

  // Regenerates the post text from feedback (e.g. "make it punchier", "lead
  // with the stat instead") — keeps whatever image is currently set rather
  // than touching it, since feedback here is about the copy.
  async function handleRegenerate() {
    if (!feedback.trim()) {
      setError("Add a note on what to change first.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/broadcast-drafts/${draftId}/linkedin-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, currentContent: content }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to regenerate post");
      setContent(data.content);
      setFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate post");
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

          <div className="mt-3 rounded-2xl border border-black/10 bg-charcoal/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-body-gray">Feedback — tell it what to change</label>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. lead with the stat, make the CTA more direct, cut the second paragraph"
              className="min-h-[60px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
              disabled={generating}
            />
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={generating || !feedback.trim()}
              className="mt-2 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
            >
              {generating ? "Regenerating…" : "Regenerate with this feedback"}
            </button>
          </div>

          <div className="mt-3">
            <p className="mb-1 text-[11px] font-semibold text-body-gray">
              Image — reused from the email when one's found, generated as an on-brand text card when
              there isn't one, or paste your own URL:
            </p>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mb-2 h-32 w-auto rounded border border-black/10" />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl ?? ""}
                onChange={(e) => setImageUrl(e.target.value || null)}
                placeholder="https://… (leave blank to post without an image)"
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
              />
              <button
                type="button"
                onClick={() => {
                  const headline = content.split("\n").find((l) => l.trim())?.trim() ?? "Hometown Quotes";
                  setImageUrl(`/api/linkedin-posts/brand-image?text=${encodeURIComponent(headline)}`);
                }}
                className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-charcoal/5"
              >
                Generate branded visual
              </button>
            </div>
            <p className="mt-1 text-[11px] text-body-gray">
              The generated card uses the post's first line as the headline — edit the post text above
              first if you want different wording on it, then regenerate.
            </p>
          </div>

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
