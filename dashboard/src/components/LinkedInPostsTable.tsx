"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LinkedInPost, LinkedInPostStatus } from "@/lib/data";
import { LINKEDIN_ACCOUNTS } from "@/lib/data";

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

function PostCard({ post }: { post: LinkedInPost }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [content, setContent] = useState(post.content);

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

  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
      {/* Admin controls — kept visually separate from the post mock below so
          the mock reads as "what this will look like on LinkedIn," not as
          part of the managed queue UI. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 bg-charcoal/[0.02] px-4 py-2">
        <div className="flex items-center gap-2">
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
        </div>
        <div className="flex items-center gap-3">
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
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={handleDelete} disabled={saving} className="text-xs font-semibold text-red-600 underline disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>

      {/* LinkedIn post mock */}
      <div className="mx-auto max-w-[552px] px-4 pb-1 pt-3">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
            {initials(post.account)}
          </div>
          <div>
            <p className="text-sm font-semibold text-charcoal">{post.account}</p>
            <p className="text-xs text-body-gray">Hometown Quotes</p>
            <p className="text-xs text-body-gray">
              {post.scheduledDate
                ? new Date(post.scheduledDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "Not scheduled"}{" "}
              · 🌐
            </p>
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

      {post.imageUrl && (
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="block w-full cursor-zoom-in border-t border-black/5 p-0"
          title="Click to zoom"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="" className="max-h-[420px] w-full object-cover" />
        </button>
      )}

      <div className="mx-auto flex max-w-[552px] border-t border-black/5 px-2">
        <EngagementIcon label="Like" />
        <EngagementIcon label="Comment" />
        <EngagementIcon label="Repost" />
        <EngagementIcon label="Send" />
      </div>

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
      <p className="rounded-2xl bg-white p-6 text-sm text-body-gray shadow-sm">
        No LinkedIn posts yet — generate one from a broadcast draft's detail page.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
