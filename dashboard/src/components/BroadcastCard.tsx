"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeapBroadcastForm } from "./KeapBroadcastForm";
import { OPEN_RATE_CAVEAT } from "@/lib/open-rate-caveat";

export type BroadcastCardData = {
  id: number;
  campaignName: string;
  dateSent: string;
  emailsDelivered: number;
  opens: number;
  clicks: number;
  replies: number;
  carrier: string;
};

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex flex-col" title={title}>
      <span className="text-2xl font-bold text-charcoal font-heading">{value}</span>
      <span className="text-xs uppercase tracking-wide text-body-gray">{label}</span>
    </div>
  );
}

export function BroadcastCard({ broadcast }: { broadcast: BroadcastCardData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${broadcast.campaignName}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/keap-broadcasts/${broadcast.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to delete");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-3xl border-l-4 border-sky-500 bg-white p-6 shadow-sm">
        <KeapBroadcastForm
          broadcastId={broadcast.id}
          initialValues={{
            campaignName: broadcast.campaignName,
            dateSent: broadcast.dateSent,
            emailsDelivered: String(broadcast.emailsDelivered),
            opens: String(broadcast.opens),
            clicks: String(broadcast.clicks),
            replies: String(broadcast.replies),
            carrier: broadcast.carrier,
          }}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border-l-4 border-sky-500 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-semibold text-charcoal">
            {broadcast.campaignName}
          </h3>
          <span className="text-xs text-body-gray">{broadcast.carrier}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-body-gray">
            {new Date(broadcast.dateSent + "T00:00:00").toLocaleDateString()}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-charcoal underline"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-semibold text-red-600 underline disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Metric label="Delivered" value={broadcast.emailsDelivered.toLocaleString()} />
        <Metric label="Opens" value={broadcast.opens.toLocaleString()} />
        <Metric label="Clicks" value={broadcast.clicks.toLocaleString()} />
        <Metric label="Replies" value={broadcast.replies.toLocaleString()} />
        <Metric
          label="Open rate*"
          value={pct(broadcast.opens, broadcast.emailsDelivered)}
          title={OPEN_RATE_CAVEAT}
        />
        <Metric label="CTR" value={pct(broadcast.clicks, broadcast.emailsDelivered)} />
      </div>
    </div>
  );
}
