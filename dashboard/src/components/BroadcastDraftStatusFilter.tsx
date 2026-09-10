"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { BroadcastDraftStatus } from "@/lib/data";

const OPTIONS: { value: BroadcastDraftStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "writing", label: "Writing" },
  { value: "for_approval", label: "For Approval" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
];

export function BroadcastDraftStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "all";

  return (
    <select
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value === "all") {
          params.delete("status");
        } else {
          params.set("status", e.target.value);
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
