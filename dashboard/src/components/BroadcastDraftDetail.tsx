"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { BroadcastDraft, BroadcastDraftComment } from "@/lib/data";
import { renderBroadcastDraftHtml } from "@/lib/broadcast-draft-template";
import { BroadcastDraftStatusSelect } from "@/components/BroadcastDraftStatusSelect";
import { BroadcastDraftForm, draftToFormValues } from "@/components/BroadcastDraftForm";

type PendingSelection = { text: string; x: number; y: number };

export function BroadcastDraftDetail({
  draft,
  comments,
}: {
  draft: BroadcastDraft;
  comments: BroadcastDraftComment[];
}) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Selecting a phrase in the preview shows a small "Comment on this"
  // button anchored to the selection; clicking it opens the comment box
  // pre-attached to that exact phrase so the AI regenerate step gets
  // precise context instead of a vague comment alone.
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [attachedSelection, setAttachedSelection] = useState<string | null>(null);

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

  // Preview-only: opens clicked links in a new tab so testing the CTA
  // doesn't navigate the iframe away from the email itself. Not applied to
  // `html` (used by Copy HTML) — that stays exactly what will go into Keap.
  const previewHtml = useMemo(
    () => html.replace("<head>", "<head><base target=\"_blank\">"),
    [html]
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // The iframe reloads its document every time `html` changes (srcDoc), so
  // the selection listener has to be re-attached on each load rather than
  // once on mount.
  function handleIframeLoad() {
    const iframeDoc = iframeRef.current?.contentDocument;
    const iframeWin = iframeRef.current?.contentWindow;
    if (!iframeDoc || !iframeWin) return;

    iframeDoc.addEventListener("mouseup", () => {
      const selection = iframeWin.getSelection();
      const text = selection?.toString().trim();
      const iframeEl = iframeRef.current;
      if (!text || !selection || selection.rangeCount === 0 || !iframeEl) {
        setPendingSelection(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const iframeRect = iframeEl.getBoundingClientRect();
      setPendingSelection({
        text,
        x: iframeRect.left + rect.left + rect.width / 2,
        y: iframeRect.top + rect.top,
      });
    });
  }

  function attachSelectionToComment() {
    if (!pendingSelection) return;
    setAttachedSelection(pendingSelection.text);
    setPendingSelection(null);
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
        body: JSON.stringify({ comment: newComment, selectedText: attachedSelection }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to add comment");
      setNewComment("");
      setAttachedSelection(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setPosting(false);
    }
  }

  async function handleToggleResolved(commentId: number, resolved: boolean) {
    setResolvingId(commentId);
    setError(null);
    try {
      const res = await fetch(`/api/broadcast-drafts/${draft.id}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to update comment");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update comment");
    } finally {
      setResolvingId(null);
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
            <BroadcastDraftStatusSelect draftId={draft.id} status={draft.status} />
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

      {pendingSelection && (
        <button
          onClick={attachSelectionToComment}
          style={{ position: "fixed", left: pendingSelection.x, top: pendingSelection.y, transform: "translate(-50%, -110%)" }}
          className="z-50 whitespace-nowrap rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-charcoal/80"
        >
          Comment on this
        </button>
      )}

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
          <p className="mb-2 text-xs text-body-gray">
            Tip: highlight any phrase below to leave feedback tied to that exact text.
          </p>
          <iframe
            ref={iframeRef}
            srcDoc={previewHtml}
            title="Email preview"
            onLoad={handleIframeLoad}
            className="w-full rounded-lg border border-black/10"
            style={{ height: 800 }}
          />
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-heading text-base font-semibold text-charcoal">Feedback</h3>
          <form onSubmit={handleAddComment} className="mb-4 flex flex-col gap-2">
            {attachedSelection && (
              <div className="flex items-start justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span>
                  On: <span className="italic">&quot;{attachedSelection}&quot;</span>
                </span>
                <button type="button" onClick={() => setAttachedSelection(null)} className="shrink-0 font-semibold underline">
                  Remove
                </button>
              </div>
            )}
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
              {comments.map((c) => {
                const done = c.applied || c.resolved;
                return (
                  <div
                    key={c.id}
                    className={`rounded-lg border border-black/5 p-3 ${done ? "bg-mist/30" : "bg-mist/60"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${done ? "text-body-gray" : "text-charcoal"}`}>
                        {c.author}
                      </span>
                      <span className="text-[10px] text-body-gray">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    {c.selectedText && (
                      <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs italic text-amber-800">
                        &quot;{c.selectedText}&quot;
                      </p>
                    )}
                    <p className={`mt-1 text-sm ${done ? "text-body-gray" : "text-charcoal"}`}>{c.comment}</p>
                    <div className="mt-2 flex items-center gap-3">
                      {c.applied ? (
                        <span className="text-xs font-semibold text-brand-green-dark">✓ Applied by AI</span>
                      ) : c.resolved ? (
                        <span className="text-xs font-semibold text-brand-green-dark">✓ Resolved</span>
                      ) : (
                        <button
                          onClick={() => handleRegenerate(c.id)}
                          disabled={regeneratingId === c.id}
                          className="text-xs font-semibold text-sky-600 underline disabled:opacity-50"
                        >
                          {regeneratingId === c.id ? "Regenerating…" : "Regenerate from this"}
                        </button>
                      )}
                      {!c.applied && (
                        <button
                          onClick={() => handleToggleResolved(c.id, !c.resolved)}
                          disabled={resolvingId === c.id}
                          className="text-xs font-semibold text-body-gray underline disabled:opacity-50"
                        >
                          {resolvingId === c.id ? "Saving…" : c.resolved ? "Reopen" : "Mark Resolved"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
