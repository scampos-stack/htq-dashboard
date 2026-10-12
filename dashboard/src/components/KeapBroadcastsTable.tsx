"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KeapBroadcastForm } from "./KeapBroadcastForm";
import { OPEN_RATE_CAVEAT } from "@/lib/open-rate-caveat";
import type { BroadcastCardData } from "./BroadcastCard";

const CATEGORY_LABELS: Record<string, string> = {
  sales_marketing: "Sales / Marketing",
  general: "General",
};

type SortKey = "dateSent" | "emailsDelivered" | "openRate" | "clicks" | "ctr" | "replies";

function pct(numerator: number, denominator: number): number {
  return denominator ? (numerator / denominator) * 100 : -1; // -1 sorts "—" last
}

function fmtPct(v: number): string {
  return v < 0 ? "—" : `${v.toFixed(1)}%`;
}

// Date-sorted, filterable list instead of cards grouped by campaign theme —
// the point is to put every send side by side so open rate / CTR across
// past and newer emails is easy to scan and compare at a glance.
export function KeapBroadcastsTable({ broadcasts }: { broadcasts: BroadcastCardData[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("dateSent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const carriers = useMemo(
    () => [...new Set(broadcasts.map((b) => b.carrier))].sort(),
    [broadcasts]
  );

  const rows = useMemo(() => {
    const withMetrics = broadcasts
      .filter((b) => carrierFilter === "all" || b.carrier === carrierFilter)
      .filter((b) => categoryFilter === "all" || b.category === categoryFilter)
      .map((b) => ({
        ...b,
        openRate: pct(b.opens, b.emailsDelivered),
        ctr: pct(b.clicks, b.emailsDelivered),
      }));
    withMetrics.sort((a, b) => {
      const av = sortKey === "dateSent" ? a.dateSent : a[sortKey];
      const bv = sortKey === "dateSent" ? b.dateSent : b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withMetrics;
  }, [broadcasts, carrierFilter, categoryFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "dateSent" ? "desc" : "desc");
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/keap-broadcasts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to delete");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  function Th({ label, sortKeyFor, numeric }: { label: string; sortKeyFor: SortKey; numeric?: boolean }) {
    const active = sortKey === sortKeyFor;
    return (
      <th
        onClick={() => toggleSort(sortKeyFor)}
        className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-body-gray hover:text-charcoal ${numeric ? "text-right" : "text-left"}`}
      >
        {label}
        {active && <span className="ml-1 text-charcoal">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </th>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={carrierFilter}
          onChange={(e) => setCarrierFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal shadow-sm"
        >
          <option value="all">All carriers</option>
          {carriers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal shadow-sm"
        >
          <option value="all">All categories</option>
          <option value="sales_marketing">Sales / Marketing</option>
          <option value="general">General</option>
        </select>
        <span className="text-xs text-body-gray">
          {rows.length} broadcast{rows.length === 1 ? "" : "s"} — click a column to sort
        </span>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-black/5">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-body-gray">
                Campaign
              </th>
              <Th label="Sent" sortKeyFor="dateSent" />
              <Th label="Delivered" sortKeyFor="emailsDelivered" numeric />
              <Th label="Open Rate*" sortKeyFor="openRate" numeric />
              <Th label="Clicks" sortKeyFor="clicks" numeric />
              <Th label="CTR" sortKeyFor="ctr" numeric />
              <Th label="Replies" sortKeyFor="replies" numeric />
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-body-gray">
                  No broadcasts match this filter.
                </td>
              </tr>
            )}
            {rows.map((b) =>
              editingId === b.id ? (
                <tr key={b.id} className="border-b border-black/5 bg-sky-50/40">
                  <td colSpan={8} className="p-4">
                    <KeapBroadcastForm
                      broadcastId={b.id}
                      initialValues={{
                        campaignName: b.campaignName,
                        dateSent: b.dateSent,
                        emailsDelivered: String(b.emailsDelivered),
                        opens: String(b.opens),
                        clicks: String(b.clicks),
                        replies: String(b.replies),
                        carrier: b.carrier,
                        category: b.category,
                      }}
                      onDone={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={b.id} className="border-b border-black/5 hover:bg-charcoal/[0.02]">
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-charcoal">{b.campaignName}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-body-gray">
                      {b.carrier}
                      {b.category === "general" && (
                        <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          {CATEGORY_LABELS.general}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm text-charcoal">
                    {new Date(b.dateSent + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm text-charcoal">{b.emailsDelivered.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-sm font-semibold text-charcoal" title={OPEN_RATE_CAVEAT}>
                    {fmtPct(b.openRate)}
                    <span className="ml-0.5 text-body-gray">({b.opens.toLocaleString()})</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm text-charcoal">{b.clicks.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-sm text-charcoal">{fmtPct(b.ctr)}</td>
                  <td className="px-3 py-2.5 text-right text-sm text-charcoal">{b.replies.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs">
                    <button onClick={() => setEditingId(b.id)} className="font-semibold text-charcoal underline">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b.id, b.campaignName)}
                      disabled={deletingId === b.id}
                      className="ml-3 font-semibold text-red-600 underline disabled:opacity-50"
                    >
                      {deletingId === b.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
