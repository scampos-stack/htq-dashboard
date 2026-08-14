"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CARRIERS = [
  "General",
  "Independent",
  "Farmers",
  "State Farm",
  "Country Financial",
  "Liberty Mutual",
  "AAA",
  "Allstate",
  "American Family",
];

export function CarrierEditor({
  campaignId,
  carrier,
}: {
  campaignId: number;
  carrier: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(carrier ?? "General");

  async function handleChange(newCarrier: string) {
    setValue(newCarrier);
    setSaving(true);
    try {
      await fetch("/api/campaign-carrier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, carrier: newCarrier }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-full border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-charcoal disabled:opacity-60"
    >
      {CARRIERS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
