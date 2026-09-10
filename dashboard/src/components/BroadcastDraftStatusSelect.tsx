"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BroadcastDraftStatus } from "@/lib/data";

const STATUS_OPTIONS: { value: BroadcastDraftStatus; label: string; className: string }[] = [
  { value: "not_started", label: "Not Started", className: "bg-charcoal/10 text-charcoal" },
  { value: "writing", label: "Writing", className: "bg-amber-500/15 text-amber-700" },
  { value: "for_approval", label: "For Approval", className: "bg-sky-500/15 text-sky-700" },
  { value: "approved", label: "Approved", className: "bg-brand-green/15 text-brand-green-dark" },
  { value: "sent", label: "Sent", className: "bg-violet-500/15 text-violet-700" },
];

// Lets the status change right from the detail header instead of requiring
// a trip through the full edit form for the most common single-field edit.
export function BroadcastDraftStatusSelect({
  draftId,
  status,
}: {
  draftId: number;
  status: BroadcastDraftStatus;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const current = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];

  async function handleChange(next: BroadcastDraftStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/broadcast-drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to update status");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={status}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value as BroadcastDraftStatus)}
      className={`inline-flex items-center rounded-full border-none px-3 py-1 text-xs font-semibold outline-none disabled:opacity-60 ${current.className}`}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
