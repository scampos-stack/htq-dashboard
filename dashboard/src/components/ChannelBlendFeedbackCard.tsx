import type { ChannelBlendFeedbackSummary } from "@/lib/data";

export function ChannelBlendFeedbackCard({
  summary,
}: {
  summary: ChannelBlendFeedbackSummary;
}) {
  if (!summary) {
    return (
      <div className="mb-6 rounded-3xl border-l-4 border-violet-500 bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-heading text-base font-semibold text-charcoal">
          Top Feedback (AI Summary)
        </h3>
        <p className="text-sm text-body-gray">
          No summary yet — upload a Feedback disposition file to generate one.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-3xl border-l-4 border-violet-500 bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-charcoal">
          Top Feedback (AI Summary)
        </h3>
        <span className="text-xs text-body-gray">
          Generated {new Date(summary.generatedAt).toLocaleString()}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">
        {summary.summary}
      </p>
    </div>
  );
}
