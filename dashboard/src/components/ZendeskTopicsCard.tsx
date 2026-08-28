"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ZendeskTopicsSummary } from "@/lib/data";

export function ZendeskTopicsCard({ summary }: { summary: ZendeskTopicsSummary }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/zendesk/topics-summary", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to generate summary");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  }

  const regenerateButton = (
    <button
      onClick={handleRegenerate}
      disabled={generating}
      className="text-xs font-semibold text-charcoal underline disabled:opacity-50"
    >
      {generating ? "Generating…" : "Regenerate"}
    </button>
  );

  if (!summary) {
    return (
      <div className="mb-6 rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-charcoal">
            Top Topics (AI Summary)
          </h3>
          {regenerateButton}
        </div>
        <p className="text-sm text-body-gray">
          No summary yet — click Regenerate to analyze synced tickets.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-charcoal">
          Top Topics (AI Summary)
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-body-gray">
            Generated {new Date(summary.generatedAt).toLocaleString()}
          </span>
          {regenerateButton}
        </div>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">
        {summary.summary}
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
