"use client";

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
  const [showForm, setShowForm] = useState(false);
  const groups = groupDrafts(drafts);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-body-gray">
          Plan, preview, and collect feedback on upcoming Keap broadcasts before they're sent — this doesn't send
          anything itself, so the final content still gets copied into Keap by hand once approved.
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="whitespace-nowrap rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
        >
          {showForm ? "Close" : "+ New Draft"}
        </button>
      </div>

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
                {g.drafts.map((d) => (
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
                      <BroadcastDraftStatusPill status={d.status} />
                      <span className="text-xs font-semibold text-sky-600">View / Edit →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
