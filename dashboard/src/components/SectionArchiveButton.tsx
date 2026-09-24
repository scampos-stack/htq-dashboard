"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Archive/Restore toggle for a dashboard section. Archiving only hides the
// section from the main flow (see getArchivedSectionKeys) — nothing is
// deleted, so restoring brings it straight back.
export function SectionArchiveButton({
  sectionKey,
  label,
  archived,
}: {
  sectionKey: string;
  label: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    if (!archived && !confirm(`Archive ${label}? It moves to the Archived strip at the bottom and can be restored any time. No data is deleted.`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sections/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey, archived: !archived }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to update");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-charcoal shadow-sm hover:bg-charcoal/5 disabled:opacity-60"
    >
      {saving ? "Saving…" : archived ? "Restore" : "Archive"}
    </button>
  );
}
