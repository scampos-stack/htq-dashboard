"use client";

import { useState } from "react";
import Link from "next/link";
import type { BroadcastDraft } from "@/lib/data";
import { BroadcastDraftStatusPill } from "@/components/BroadcastDraftStatusPill";
import { BroadcastDraftForm } from "@/components/BroadcastDraftForm";

export function BroadcastDraftsList({ drafts }: { drafts: BroadcastDraft[] }) {
  const [showForm, setShowForm] = useState(false);

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

      {drafts.length === 0 ? (
        <p className="text-body-gray">No drafts yet — click "New Draft" to plan your next broadcast.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map((d) => (
            <Link
              key={d.id}
              href={`/broadcast-drafts/${d.id}`}
              className="flex flex-col gap-2 rounded-3xl border-l-4 border-sky-500 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-base font-semibold text-charcoal">{d.campaignTheme}</span>
                  <BroadcastDraftStatusPill status={d.status} />
                </div>
                <p className="mt-1 text-xs text-body-gray">
                  {new Date(d.targetDate + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {d.listSegment}
                  {d.audienceEstimate != null && ` · ~${d.audienceEstimate.toLocaleString()} recipients`}
                </p>
              </div>
              <span className="text-xs font-semibold text-sky-600">View / Edit →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
