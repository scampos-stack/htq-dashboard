"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const GOALS = [
  { value: "automation_lead_marketing", label: "Lead Gen / Marketing" },
  { value: "automation_customer_comms", label: "Client Nurture / Value-Add" },
  { value: "uncategorized", label: "Uncategorized" },
];

export function AutomationGoalEditor({
  campaignId,
  category,
  excludeFromMetrics,
}: {
  campaignId: number;
  category: string;
  excludeFromMetrics: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState(category);
  const [excluded, setExcluded] = useState(excludeFromMetrics);

  async function save(next: { category?: string; excludeFromMetrics?: boolean }) {
    setSaving(true);
    try {
      await fetch("/api/campaign-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...next }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={goal}
        disabled={saving}
        onChange={(e) => {
          setGoal(e.target.value);
          save({ category: e.target.value });
        }}
        className="rounded-full border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-charcoal disabled:opacity-60"
      >
        {GOALS.map((g) => (
          <option key={g.value} value={g.value}>
            {g.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-body-gray">
        <input
          type="checkbox"
          checked={excluded}
          disabled={saving}
          onChange={(e) => {
            setExcluded(e.target.checked);
            save({ excludeFromMetrics: e.target.checked });
          }}
        />
        Exclude from conversion metrics
      </label>
    </div>
  );
}
