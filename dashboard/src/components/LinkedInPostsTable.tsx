"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LinkedInPost, LinkedInPostStatus } from "@/lib/data";
import { LINKEDIN_ACCOUNTS } from "@/lib/data";
import { LinkedInPostAssigneeSelect } from "@/components/LinkedInPostAssigneeSelect";

type LinkedInPostComment = {
  id: number;
  linkedin_post_id: number;
  author: string;
  comment: string;
  resolved: boolean;
  created_at: string;
};

const STATUS_OPTIONS: { value: LinkedInPostStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

const STATUS_STYLE: Record<LinkedInPostStatus, string> = {
  draft: "bg-charcoal/10 text-body-gray",
  approved: "bg-sky-500/15 text-sky-700",
  scheduled: "bg-amber-500/15 text-amber-700",
  published: "bg-brand-green/15 text-brand-green-dark",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

// Purely cosmetic — makes the icons read as LinkedIn chrome without
// pulling in an icon library for four one-off glyphs.
function EngagementIcon({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-body-gray">
      <span className="h-4 w-4 rounded-sm border-[1.5px] border-body-gray" />
      {label}
    </div>
  );
}

export function LinkedInPostRow({ post }: { post: LinkedInPost }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const [content, setContent] = useState(post.content);
  const [editingImage, setEditingImage] = useState(false);
  const [imageTitle, setImageTitle] = useState(post.content.split("\n").find((l) => l.trim())?.trim() ?? "");
  const [imageAbout, setImageAbout] = useState("For agents. By agents.");
  const [comments, setComments] = useState<LinkedInPostComment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  async function loadComments() {
    try {
      const res = await fetch(`/api/linkedin-posts/${post.id}/comments`);
      const data = await res.json();
      if (res.ok && data.ok) setComments(data.comments);
    } catch {
      // Comments are supplementary — leave the panel silently empty on failure.
    }
  }

  // Loaded on mount (not gated on expand) so the open-comment-count badge
  // is visible on the collapsed row too — that's the whole point, so Paula
  // can see there's feedback waiting without opening every row.
  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/linkedin-posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to add comment");
      setNewComment("");
      await loadComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setPosting(false);
    }
  }

  async function handleToggleResolved(commentId: number, resolved: boolean) {
    setResolvingId(commentId);
    try {
      const res = await fetch(`/api/linkedin-posts/${post.id}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to update comment");
      await loadComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update comment");
    } finally {
      setResolvingId(null);
    }
  }

  const openCommentCount = (comments ?? []).filter((c) => !c.resolved).length;

  function regenerateBrandedVisual() {
    const params = new URLSearchParams({
      text: imageTitle.trim() || "Hometown Quotes",
      about: imageAbout.trim() || "For agents. By agents.",
    });
    patch({ imageUrl: `/api/linkedin-posts/brand-image?${params.toString()}` });
    setImgBroken(false);
    setEditingImage(false);
  }

  async function patch(fields: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/linkedin-posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to update post");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this post from the queue?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/linkedin-posts/${post.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to delete post");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
      setSaving(false);
    }
  }

  // The internal label shown on this row is its own field, separate from
  // the post body — editing it used to rewrite the post's first line, which
  // meant "what is this post about" and "what the post actually opens with"
  // couldn't be different things. Falls back to the first line only for
  // posts saved before the title column existed.
  const headline = post.title?.trim() || post.content.split("\n").find((l) => l.trim()) || post.content;
  const dateLabel = post.scheduledDate
    ? new Date(post.scheduledDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Not scheduled";

  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headlineDraft, setHeadlineDraft] = useState(headline);

  function saveHeadline() {
    patch({ title: headlineDraft });
    setEditingHeadline(false);
  }

  return (
    <div className="border-b border-black/5 last:border-0">
      <div className="flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-charcoal/5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-green text-[10px] font-bold text-white">
          {initials(post.account)}
        </div>
        <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-700">LinkedIn</span>
        {editingHeadline ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              autoFocus
              type="text"
              value={headlineDraft}
              onChange={(e) => setHeadlineDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveHeadline();
                if (e.key === "Escape") setEditingHeadline(false);
              }}
              className="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1 text-sm font-semibold text-charcoal"
            />
            <button onClick={saveHeadline} disabled={saving} className="shrink-0 text-xs font-semibold text-sky-600 underline disabled:opacity-50">
              Save
            </button>
            <button onClick={() => setEditingHeadline(false)} className="shrink-0 text-xs font-semibold text-body-gray underline">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setHeadlineDraft(headline);
              setEditingHeadline(true);
            }}
            title="Edit title"
            className="min-w-0 flex-1 truncate text-left font-semibold text-charcoal underline decoration-dotted decoration-black/20 underline-offset-4 hover:decoration-sky-500"
          >
            {headline}
          </button>
        )}
        <span className="hidden shrink-0 text-xs text-body-gray sm:inline">{post.account}</span>
        <LinkedInPostAssigneeSelect postId={post.id} assignedTo={post.assignedTo} />
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[post.status]}`}>
          {STATUS_OPTIONS.find((o) => o.value === post.status)?.label}
        </span>
        <span className="shrink-0 text-xs text-body-gray">{dateLabel}</span>
        {openCommentCount > 0 && (
          <span
            className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
            title={`${openCommentCount} open comment${openCommentCount === 1 ? "" : "s"}`}
          >
            💬 {openCommentCount}
          </span>
        )}
        <button onClick={() => setExpanded((v) => !v)} className="shrink-0 text-xs font-semibold text-sky-600">
          {expanded ? "Hide ▲" : "View ▼"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-black/5 bg-charcoal/[0.02] px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={post.account}
              disabled={saving}
              onChange={(e) => patch({ account: e.target.value })}
              className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-charcoal disabled:opacity-60"
            >
              {LINKEDIN_ACCOUNTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={post.status}
              disabled={saving}
              onChange={(e) => patch({ status: e.target.value })}
              className={`rounded-full border-none px-2.5 py-1 text-xs font-semibold outline-none disabled:opacity-60 ${STATUS_STYLE[post.status]}`}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={post.scheduledDate ?? ""}
              disabled={saving}
              onChange={(e) => patch({ scheduledDate: e.target.value || null })}
              className="rounded-lg border border-black/10 px-2 py-1 text-xs text-charcoal disabled:opacity-60"
            />
            <div className="ml-auto flex items-center gap-3">
              {post.imageUrl && (
                <a
                  href={post.imageUrl}
                  download={`linkedin-post-${post.id}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-600 underline"
                >
                  Download image
                </a>
              )}
              <button onClick={() => setEditing((v) => !v)} className="text-xs font-semibold text-sky-600 underline">
                {editing ? "Cancel" : "Edit text"}
              </button>
              <button onClick={() => setEditingImage((v) => !v)} className="text-xs font-semibold text-sky-600 underline">
                {editingImage ? "Cancel" : "Edit image"}
              </button>
              <button onClick={handleDelete} disabled={saving} className="text-xs font-semibold text-red-600 underline disabled:opacity-50">
                Delete
              </button>
            </div>
          </div>

          {editingImage && (
            <div className="mb-3 rounded-lg border border-black/10 bg-white p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-body-gray">
                  Title (on the card)
                  <input
                    type="text"
                    value={imageTitle}
                    onChange={(e) => setImageTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
                  />
                </label>
                <label className="text-xs font-semibold text-body-gray">
                  About (small line at the bottom)
                  <input
                    type="text"
                    value={imageAbout}
                    onChange={(e) => setImageAbout(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
                  />
                </label>
              </div>
              <button
                onClick={regenerateBrandedVisual}
                disabled={saving}
                className="mt-2 rounded-full bg-charcoal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Regenerate image
              </button>
            </div>
          )}

          {/* LinkedIn post mock — image stays inside the same max-width as the
              text so it reads at post width, not the full card width. */}
          <div className="mx-auto max-w-[552px] overflow-hidden rounded-lg border border-black/10 bg-white">
            <div className="px-4 pb-1 pt-3">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                  {initials(post.account)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">{post.account}</p>
                  <p className="text-xs text-body-gray">Hometown Quotes</p>
                  <p className="text-xs text-body-gray">{dateLabel} · 🌐</p>
                </div>
              </div>

              {editing ? (
                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[120px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
                  />
                  <button
                    onClick={() => {
                      patch({ content });
                      setEditing(false);
                    }}
                    disabled={saving}
                    className="mt-2 rounded-full bg-charcoal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{post.content}</p>
              )}
            </div>

            {post.imageUrl &&
              (imgBroken ? (
                <div className="border-t border-black/5 bg-charcoal/[0.03] px-4 py-3 text-xs text-body-gray">
                  Image didn&apos;t load —{" "}
                  <a href={post.imageUrl} target="_blank" rel="noreferrer" className="underline">
                    open it directly
                  </a>{" "}
                  to check the URL.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setZoomed(true)}
                  className="block w-full cursor-zoom-in border-t border-black/5 p-0"
                  title="Click to zoom"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.imageUrl}
                    alt=""
                    onError={() => setImgBroken(true)}
                    className="w-full object-cover"
                  />
                </button>
              ))}

            <div className="flex border-t border-black/5 px-2">
              <EngagementIcon label="Like" />
              <EngagementIcon label="Comment" />
              <EngagementIcon label="Repost" />
              <EngagementIcon label="Send" />
            </div>
          </div>

          <div className="mx-auto mt-4 max-w-[552px] rounded-lg border border-black/10 bg-white p-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-body-gray">Feedback</h4>
            <form onSubmit={handleAddComment} className="mb-3 flex flex-col gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="e.g. fix the title, swap the image, shorten the second line"
                className="min-h-[60px] w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
              />
              <button
                type="submit"
                disabled={posting || !newComment.trim()}
                className="self-end rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
              >
                {posting ? "Posting…" : "Add Comment"}
              </button>
            </form>

            {comments === null ? (
              <p className="text-xs text-body-gray">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-body-gray">No feedback yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-lg border border-black/5 p-2.5 ${c.resolved ? "bg-mist/30" : "bg-mist/60"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${c.resolved ? "text-body-gray" : "text-charcoal"}`}>
                        {c.author}
                      </span>
                      <span className="text-[10px] text-body-gray">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className={`mt-1 text-sm ${c.resolved ? "text-body-gray" : "text-charcoal"}`}>{c.comment}</p>
                    <button
                      onClick={() => handleToggleResolved(c.id, !c.resolved)}
                      disabled={resolvingId === c.id}
                      className="mt-1 text-xs font-semibold text-body-gray underline disabled:opacity-50"
                    >
                      {resolvingId === c.id ? "Saving…" : c.resolved ? "Reopen" : "Mark Resolved"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {zoomed && post.imageUrl && (
        <div
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-full max-w-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt="" className="max-h-[80vh] max-w-full rounded-lg object-contain" />
            <div className="flex gap-3">
              <a
                href={post.imageUrl}
                download={`linkedin-post-${post.id}.png`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-mist"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => setZoomed(false)}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-mist"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LinkedInPostsTable({ posts }: { posts: LinkedInPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="rounded-3xl bg-white p-6 text-sm text-body-gray shadow-sm">
        No LinkedIn posts yet — generate one from a broadcast draft's detail page.
      </p>
    );
  }

  return (
    <div className="rounded-3xl border-l-4 border-sky-500 bg-white shadow-sm">
      {posts.map((p) => (
        <LinkedInPostRow key={p.id} post={p} />
      ))}
    </div>
  );
}
