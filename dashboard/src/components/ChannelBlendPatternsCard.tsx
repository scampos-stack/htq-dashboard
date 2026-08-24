"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChannelBlendCategoryPattern } from "@/lib/data";

export function ChannelBlendPatternsCard({
  patterns,
}: {
  patterns: ChannelBlendCategoryPattern[];
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/channel-blend/patterns-summary", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to generate summary");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-charcoal">
          Recurring Patterns (AI Summary)
        </h3>
        <button
          onClick={handleRegenerate}
          disabled={generating}
          className="text-xs font-semibold text-charcoal underline disabled:opacity-50"
        >
          {generating ? "Generating…" : "Regenerate"}
        </button>
      </div>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {patterns.length === 0 ? (
        <div className="rounded-3xl border-l-4 border-violet-500 bg-white p-6 shadow-sm">
          <p className="text-sm text-body-gray">
            No summary yet — upload a disposition file, or click Regenerate.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {patterns.map((p) => (
            <div
              key={p.category}
              className="rounded-3xl border-l-4 border-violet-500 bg-white p-5 shadow-sm"
            >
              <h4 className="mb-2 font-heading text-sm font-semibold text-charcoal">
                {p.category}
              </h4>
              <p className="whitespace-pre-line text-xs leading-relaxed text-charcoal">
                {p.summary}
              </p>
              <p className="mt-3 text-[10px] text-body-gray">
                Generated {new Date(p.generatedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
