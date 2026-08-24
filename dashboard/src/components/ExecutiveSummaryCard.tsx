import type { WoodpeckerAiSummary } from "@/lib/data";

export function ExecutiveSummaryCard({ summary }: { summary: WoodpeckerAiSummary }) {
  if (!summary) {
    return (
      <div className="mb-6 rounded-3xl border-l-4 border-brand-green bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-heading text-base font-semibold text-charcoal">
          Executive Summary
        </h3>
        <p className="text-sm text-body-gray">
          No summary yet — click &quot;Sync Now&quot; to generate one from the
          latest Woodpecker data.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-3xl border-l-4 border-brand-green bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-charcoal">
          Executive Summary
        </h3>
        <span className="text-xs text-body-gray">
          Generated {new Date(summary.generatedAt).toLocaleString()}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-charcoal">{summary.summary}</p>
    </div>
  );
}
