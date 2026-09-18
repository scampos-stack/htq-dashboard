"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { BroadcastDraft } from "@/lib/data";
import { BroadcastDraftStatusPill } from "@/components/BroadcastDraftStatusPill";
import { BroadcastDraftForm } from "@/components/BroadcastDraftForm";

// Grouped by (date, campaign theme) — most sends fan out to 3 list segments
// on the same day with the same theme, and three near-identical rows that
// only differ in small grey text was hard to scan. One card per campaign,
// segments as compact sub-rows, so the segment (the one thing that varies)
// is what actually leads each line.
function groupDrafts(drafts: BroadcastDraft[]) {
  const groups = new Map<string, { targetDate: string; campaignTheme: string; drafts: BroadcastDraft[] }>();
  for (const d of drafts) {
    const key = `${d.targetDate}|${d.campaignTheme}`;
    const g = groups.get(key) ?? { targetDate: d.targetDate, campaignTheme: d.campaignTheme, drafts: [] };
    g.drafts.push(d);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

export function BroadcastDraftsList({ drafts }: { drafts: BroadcastDraft[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [merging, setMerging] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groups = groupDrafts(drafts);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        if (primaryId === id) setPrimaryId(next[0] ?? null);
        return next;
      }
      // Cap at 2 — merging is a pairwise operation, picking a 3rd just
      // replaces the oldest selection instead of piling up.
      const next = prev.length >= 2 ? [prev[1], id] : [...prev, id];
      if (next.length === 1) setPrimaryId(next[0]);
      return next;
    });
  }

  function exitMergeMode() {
    setMerging(false);
    setSelected([]);
    setPrimaryId(null);
    setError(null);
  }

  async function handleConfirmMerge() {
    if (selected.length !== 2 || !primaryId) return;
    const duplicateId = selected.find((id) => id !== primaryId)!;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/broadcast-drafts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, duplicateId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to merge drafts");
      exitMergeMode();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge drafts");
    } finally {
      setSaving(false);
    }
  }

  const selectedDrafts = drafts.filter((d) => selected.includes(d.id));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-body-gray">
          Plan, preview, and collect feedback on upcoming Keap broadcasts before they're sent — this doesn't send
          anything itself, so the final content still gets copied into Keap by hand once approved.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => (merging ? exitMergeMode() : setMerging(true))}
            className="whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-charcoal shadow-sm hover:bg-charcoal/5"
          >
            {merging ? "Cancel Merge" : "Merge Drafts"}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="whitespace-nowrap rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            {showForm ? "Close" : "+ New Draft"}
          </button>
        </div>
      </div>

      {merging && (
        <div className="mb-4 rounded-3xl border border-black/10 bg-white p-4">
          <p className="mb-2 text-sm text-charcoal">
            Select two drafts below, then pick which one to <strong>keep</strong> — any field that's empty on the
            kept draft gets filled in from the other one, which is then deleted.
          </p>
          {error && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {selected.length === 2 && (
            <div className="flex flex-wrap items-center gap-4">
              {selectedDrafts.map((d) => (
                <label key={d.id} className="flex items-center gap-1.5 text-sm text-charcoal">
                  <input type="radio" checked={primaryId === d.id} onChange={() => setPrimaryId(d.id)} />
                  Keep: {d.listSegment} ({d.campaignTheme})
                </label>
              ))}
              <button
                onClick={handleConfirmMerge}
                disabled={saving}
                className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Merging…" : "Confirm Merge"}
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <BroadcastDraftForm onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      )}

      {groups.length === 0 ? (
        <p className="text-body-gray">No drafts match this filter.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={`${g.targetDate}|${g.campaignTheme}`} className="rounded-3xl border-l-4 border-sky-500 bg-white p-5 shadow-sm">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-heading text-base font-semibold text-charcoal">{g.campaignTheme}</h3>
                <span className="text-xs text-body-gray">
                  {new Date(g.targetDate + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-black/5">
                {g.drafts.map((d) =>
                  merging ? (
                    <label
                      key={d.id}
                      className="flex items-center justify-between gap-3 py-2.5 cursor-pointer transition-colors hover:bg-charcoal/5"
                    >
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} />
                        <span className="font-semibold text-charcoal">{d.listSegment}</span>
                        {d.audienceEstimate != null && (
                          <span className="text-xs text-body-gray">~{d.audienceEstimate.toLocaleString()}</span>
                        )}
                      </div>
                      <BroadcastDraftStatusPill status={d.status} />
                    </label>
                  ) : (
                    <Link
                      key={d.id}
                      href={`/broadcast-drafts/${d.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-charcoal/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-charcoal">{d.listSegment}</span>
                        {d.audienceEstimate != null && (
                          <span className="text-xs text-body-gray">~{d.audienceEstimate.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {d.assignedTo && (
                          <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                            {d.assignedTo}
                          </span>
                        )}
                        <BroadcastDraftStatusPill status={d.status} />
                        <span className="text-xs font-semibold text-sky-600">View / Edit →</span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
