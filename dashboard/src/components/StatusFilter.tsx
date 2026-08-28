"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function StatusFilter({
  paramName,
  options,
  label,
  defaultValue = "all",
}: {
  paramName: string;
  options: string[];
  label: string;
  // The value used when the URL has no param for this filter yet — must
  // match whatever the server component treats as its own default, or the
  // dropdown shows "All" while the data is actually pre-filtered.
  defaultValue?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? defaultValue;

  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-body-gray">
      {label}
      <select
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === defaultValue) {
            params.delete(paramName);
          } else {
            params.set(paramName, e.target.value);
          }
          router.push(`/?${params.toString()}`);
        }}
        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold text-charcoal shadow-sm"
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
