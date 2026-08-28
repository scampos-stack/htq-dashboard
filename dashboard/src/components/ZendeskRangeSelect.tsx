"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ZendeskRangeSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preset = searchParams.get("zendeskRange") ?? "30";
  const isCustom = preset === "custom";
  const from = searchParams.get("zendeskFrom") ?? "";
  const to = searchParams.get("zendeskTo") ?? "";

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
            updateParams({ zendeskRange: "custom" });
          } else {
            updateParams({ zendeskRange: value, zendeskFrom: null, zendeskTo: null });
          }
        }}
        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold text-charcoal shadow-sm"
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="custom">Custom range</option>
      </select>

      {isCustom && (
        <>
          <input
            type="date"
            value={from}
            onChange={(e) => updateParams({ zendeskFrom: e.target.value })}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-charcoal shadow-sm"
          />
          <span className="text-xs text-body-gray">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => updateParams({ zendeskTo: e.target.value })}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-charcoal shadow-sm"
          />
        </>
      )}
    </div>
  );
}
