"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ASSIGNEE_OPTIONS = ["Unassigned", "Paula", "Sarah", "Mohammed"];

// Same pattern as BroadcastDraftAssigneeSelect, applied to the LinkedIn
// queue — whoever it's handed to gets the same assignee-change email.
export function LinkedInPostAssigneeSelect({
  postId,
  assignedTo,
}: {
  postId: number;
  assignedTo: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const current = assignedTo ?? "Unassigned";

  async function handleChange(next: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/linkedin-posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: next === "Unassigned" ? null : next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to update assignee");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update assignee");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={`shrink-0 rounded-full border-none px-2.5 py-0.5 text-[11px] font-semibold outline-none disabled:opacity-60 ${
        current === "Unassigned" ? "bg-charcoal/10 text-charcoal" : "bg-violet-500/15 text-violet-700"
      }`}
    >
      {ASSIGNEE_OPTIONS.map((a) => (
        <option key={a} value={a}>
          {a === "Unassigned" ? "Unassigned" : `In ${a}'s hands`}
        </option>
      ))}
    </select>
  );
}
