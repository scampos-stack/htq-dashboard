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
      <td className="py-3 pr-4">{formatPeriod(upload.periodStart, upload.periodEnd)}</td>
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
