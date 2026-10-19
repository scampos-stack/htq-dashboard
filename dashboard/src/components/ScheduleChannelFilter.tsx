"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: { value: "email" | "linkedin"; label: string }[] = [
  { value: "email", label: "Email (Keap)" },
  { value: "linkedin", label: "LinkedIn" },
];

export function ScheduleChannelFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("channel") === "linkedin" ? "linkedin" : "email";

  return (
    <select
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value === "email") {
          params.delete("channel");
          // Status filter only applies to the email list.
        } else {
          params.set("channel", e.target.value);
          params.delete("status");
        }
        router.push(`/broadcast-drafts?${params.toString()}`);
      }}
      className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-charcoal shadow-sm"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
