"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function JustCallRangeSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preset = searchParams.get("justcallRange") ?? "30";
  const isCustom = preset === "custom";
  const from = searchParams.get("justcallFrom") ?? "";
  const to = searchParams.get("justcallTo") ?? "";

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={preset}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "custom") {
            updateParams({ justcallRange: "custom" });
          } else {
            updateParams({ justcallRange: value, justcallFrom: null, justcallTo: null });
          }
        }}
        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold text-charcoal shadow-sm"
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="all">All time</option>
        <option value="custom">Custom range</option>
      </select>

      {isCustom && (
        <>
          <input
            type="date"
            value={from}
            onChange={(e) => updateParams({ justcallFrom: e.target.value })}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-charcoal shadow-sm"
          />
          <span className="text-xs text-body-gray">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => updateParams({ justcallTo: e.target.value })}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-charcoal shadow-sm"
          />
        </>
      )}
    </div>
  );
}
