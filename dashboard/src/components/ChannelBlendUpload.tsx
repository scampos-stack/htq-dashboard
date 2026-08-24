"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Result = { parsed: number; inserted: number; duplicates: number };

export function ChannelBlendUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  async function upload(file: File) {
    if (
      !file.name.match(/\.(xlsx|xlsm|xls|csv)$/i)
    ) {
      setError("Please upload a .xlsx, .xls, or .csv file.");
      return;
    }

    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (periodStart) formData.append("periodStart", periodStart);
      if (periodEnd) formData.append("periodEnd", periodEnd);
      const res = await fetch("/api/channel-blend/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      setResult({ parsed: data.parsed, inserted: data.inserted, duplicates: data.duplicates });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-3 font-heading text-base font-semibold text-charcoal">
        Upload Disposition Spreadsheet
      </h3>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-body-gray">
          Period start (optional)
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1 text-sm text-charcoal"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-body-gray">
          Period end (optional)
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1 text-sm text-charcoal"
          />
        </label>
        <p className="pb-1.5 text-xs text-body-gray">
          What date range this list covers — not in the file, so set it manually.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-brand-green bg-brand-green/5" : "border-black/10"
        }`}
      >
        <p className="text-sm font-semibold text-charcoal">
          {uploading ? "Processing…" : "Drop a .xlsx or .csv file here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-body-gray">
          Sheet tabs become the disposition category (e.g. Appointments, Feedback).
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {result && (
        <div className="mt-4 rounded-lg bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
          Parsed {result.parsed} rows — added {result.inserted} new,
          skipped {result.duplicates} duplicate{result.duplicates === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}
