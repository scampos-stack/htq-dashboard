"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ChannelBlendUploadRow = {
  id: number;
  filename: string;
  uploadedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  rowCount: number;
  revertedAt: string | null;
};

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? "—";
}

function UploadRow({ upload }: { upload: ChannelBlendUploadRow }) {
  const router = useRouter();
  const [reverting, setReverting] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState(upload.periodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(upload.periodEnd ?? "");

  async function handleSavePeriod() {
    setSavingPeriod(true);
    try {
      const res = await fetch(`/api/channel-blend/uploads/${upload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to save period");
      setEditingPeriod(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save period");
    } finally {
      setSavingPeriod(false);
    }
  }

  async function handleRevert() {
    if (
      !confirm(
        `Revert "${upload.filename}"? This deletes the ${upload.rowCount.toLocaleString()} rows it added. This can't be undone.`
      )
    )
      return;
    setReverting(true);
    try {
      const res = await fetch(`/api/channel-blend/uploads/${upload.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to revert");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revert");
      setReverting(false);
    }
  }

  return (
    <tr className={`border-b border-black/5 ${upload.revertedAt ? "opacity-50" : ""}`}>
      <td className="py-3 pr-4 font-semibold text-charcoal">{upload.filename}</td>
      <td className="py-3 pr-4 text-body-gray">
        {new Date(upload.uploadedAt).toLocaleString()}
      </td>
      <td className="py-3 pr-4">
        {editingPeriod ? (
          <div className="flex flex-wrap items-center gap-1">
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="rounded-lg border border-black/10 px-1.5 py-1 text-xs"
            />
            <span className="text-body-gray">–</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="rounded-lg border border-black/10 px-1.5 py-1 text-xs"
            />
            <button
              onClick={handleSavePeriod}
              disabled={savingPeriod}
              className="ml-1 text-xs font-semibold text-charcoal underline disabled:opacity-50"
            >
              {savingPeriod ? "…" : "Save"}
            </button>
            <button
              onClick={() => setEditingPeriod(false)}
              className="text-xs font-semibold text-body-gray underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingPeriod(true)}
            className="underline decoration-dotted underline-offset-2"
            title="Click to set or edit the date range this list covers"
          >
            {formatPeriod(upload.periodStart, upload.periodEnd)}
          </button>
        )}
      </td>
      <td className="py-3 pr-4">{upload.rowCount.toLocaleString()}</td>
      <td className="py-3 pr-4 whitespace-nowrap">
        {upload.revertedAt ? (
          <span className="text-xs font-semibold text-body-gray">
            Reverted {new Date(upload.revertedAt).toLocaleDateString()}
          </span>
        ) : (
          <button
            onClick={handleRevert}
            disabled={reverting}
            className="text-xs font-semibold text-red-600 underline disabled:opacity-50"
          >
            {reverting ? "…" : "Revert"}
          </button>
        )}
      </td>
    </tr>
  );
}

export function ChannelBlendUploadHistory({
  uploads,
}: {
  uploads: ChannelBlendUploadRow[];
}) {
  if (uploads.length === 0) return null;

  return (
    <div className="mb-6 overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
        Upload History
      </h3>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">File</th>
            <th className="py-2 pr-4">Uploaded</th>
            <th className="py-2 pr-4">Period</th>
            <th className="py-2 pr-4">Rows Added</th>
            <th className="py-2 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {uploads.map((u) => (
            <UploadRow key={u.id} upload={u} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
