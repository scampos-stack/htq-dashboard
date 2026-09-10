"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BroadcastDraft, BroadcastDraftComment } from "@/lib/data";
import { renderBroadcastDraftHtml } from "@/lib/broadcast-draft-template";
import { BroadcastDraftStatusPill } from "@/components/BroadcastDraftStatusPill";
import { BroadcastDraftForm, draftToFormValues } from "@/components/BroadcastDraftForm";

export function BroadcastDraftDetail({
  draft,
  comments,
}: {
  draft: BroadcastDraft;
  comments: BroadcastDraftComment[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const html = useMemo(
    () =>
      renderBroadcastDraftHtml({
        preheader: draft.preheader,
        introParagraphs: draft.introParagraphs,
        highlightHeading: draft.highlightHeading,
        highlightBody: draft.highlightBody,
        ctaText: draft.ctaText,
        ctaUrl: draft.ctaUrl,
        closingParagraph: draft.closingParagraph,
        signoffLine: draft.signoffLine,
        signoffSubtext: draft.signoffSubtext,
        footerNoteText: draft.footerNoteText,
        footerNoteLinkText: draft.footerNoteLinkText,
        footerNoteLinkUrl: draft.footerNoteLinkUrl,
      }),
    [draft]
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/broadcast-drafts/${draft.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to add comment");
      setNewComment("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setPosting(false);
    }
  }

  async function handleRegenerate(commentId: number) {
    setRegeneratingId(commentId);
    setError(null);
    try {
      const res = await fetch(`/api/broadcast-drafts/${draft.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Regenerate failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setRegeneratingId(null);
    }
  }

  if (editing) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <BroadcastDraftForm
          draftId={draft.id}
          initialValues={draftToFormValues(draft)}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-charcoal">{draft.campaignTheme}</h1>
            <BroadcastDraftStatusPill status={draft.status} />
          </div>
          <p className="mt-1 text-sm text-body-gray">
            {new Date(draft.targetDate + "T00:00:00").toLocaleDateString()} · {draft.listSegment}
            {draft.audienceEstimate != null && ` · ~${draft.audienceEstimate.toLocaleString()} recipients`}
            {draft.utmCampaign && ` · UTM: ${draft.utmCampaign}`}
            {" · v"}
            {draft.version}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-charcoal shadow-sm hover:bg-charcoal/5"
        >
          Edit
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold text-charcoal">Preview</h3>
            <button
              onClick={handleCopy}
              className="rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-charcoal/80"
            >
              {copied ? "Copied!" : "Copy HTML for Keap"}
            </button>
          </div>
          {draft.subject && (
            <p className="mb-3 text-sm text-body-gray">
              <span className="font-semibold text-charcoal">Subject:</span> {draft.subject}
            </p>
          )}
          <iframe
            srcDoc={html}
            title="Email preview"
            className="w-full rounded-lg border border-black/10"
            style={{ height: 800 }}
          />
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-heading text-base font-semibold text-charcoal">Feedback</h3>
          <form onSubmit={handleAddComment} className="mb-4 flex flex-col gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="e.g. make the CTA punchier"
              className="min-h-[70px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
            />
            <button
              type="submit"
              disabled={posting || !newComment.trim()}
              className="self-end rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
            >
              {posting ? "Posting…" : "Add Comment"}
            </button>
          </form>

          {comments.length === 0 ? (
            <p className="text-sm text-body-gray">No feedback yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-black/5 bg-mist/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-charcoal">{c.author}</span>
                    <span className="text-[10px] text-body-gray">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-charcoal">{c.comment}</p>
                  <div className="mt-2">
                    {c.applied ? (
                      <span className="text-xs font-semibold text-brand-green-dark">✓ Applied</span>
                    ) : (
                      <button
                        onClick={() => handleRegenerate(c.id)}
                        disabled={regeneratingId === c.id}
                        className="text-xs font-semibold text-sky-600 underline disabled:opacity-50"
                      >
                        {regeneratingId === c.id ? "Regenerating…" : "Regenerate from this"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
