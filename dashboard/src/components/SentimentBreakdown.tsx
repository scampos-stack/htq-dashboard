import type { WoodpeckerSentiment } from "@/lib/data";

const COLORS = {
  positive: "#0ca30c",
  neutral: "#fab219",
  negative: "#d03b3b",
};

export function SentimentBreakdown({ sentiment }: { sentiment: WoodpeckerSentiment }) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;

  return (
    <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
        Response Sentiment
      </h3>

      {total === 0 ? (
        <p className="text-sm text-body-gray">
          No tagged replies yet (based on Woodpecker&apos;s interested
          yes/maybe/no tags).
        </p>
      ) : (
        <>
          <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-charcoal/5">
            {(["positive", "neutral", "negative"] as const).map((key) =>
              sentiment[key] > 0 ? (
                <div
                  key={key}
                  style={{
                    width: `${(sentiment[key] / total) * 100}%`,
                    backgroundColor: COLORS[key],
                  }}
                />
              ) : null
            )}
          </div>
          <div className="flex flex-wrap gap-6">
            {(["positive", "neutral", "negative"] as const).map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[key] }}
                />
                <span className="text-sm font-semibold text-charcoal">
                  {sentiment[key].toLocaleString()}
                </span>
                <span className="text-xs capitalize text-body-gray">{key}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-body-gray">
        Based on Woodpecker&apos;s own interested yes/maybe/no reply tags, not
        AI-generated sentiment.
      </p>
    </div>
  );
}
