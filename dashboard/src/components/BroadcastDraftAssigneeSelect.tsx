"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ASSIGNEE_OPTIONS = ["Unassigned", "Paula", "Sarah", "Mohammed"];

// Same pattern as BroadcastDraftStatusSelect — Paula's ask was that anyone
// outside her and Sarah should be able to tell whose hands a draft is in
// without opening the full edit form.
export function BroadcastDraftAssigneeSelect({
  draftId,
  assignedTo,
}: {
  draftId: number;
  assignedTo: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const current = assignedTo ?? "Unassigned";

  async function handleChange(next: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/broadcast-drafts/${draftId}`, {
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
      className={`inline-flex items-center rounded-full border-none px-3 py-1 text-xs font-semibold outline-none disabled:opacity-60 ${
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
