import type { CsatMonthPoint } from "@/lib/data";

// A running month-by-month view for the current year — separate from the
// range-filtered CSAT tile elsewhere, which only reflects whatever window
// is currently selected. Months with no ratings yet show an empty bar
// rather than 0%, so a quiet month doesn't read as "bad."
export function CsatMonthlyTrendChart({ points, year }: { points: CsatMonthPoint[]; year: number }) {
  const hasAnyData = points.some((p) => p.good + p.bad > 0);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-1 font-heading text-base font-semibold text-charcoal">CSAT by Month ({year})</h3>
      <p className="mb-4 text-xs text-body-gray">Share of rated tickets marked Good, month by month this year.</p>

      {!hasAnyData ? (
        <p className="text-sm text-body-gray">No CSAT ratings yet this year.</p>
      ) : (
        <div className="flex h-40 items-end gap-2">
          {points.map((p) => {
            const total = p.good + p.bad;
            const pct = total > 0 ? Math.round((p.good / total) * 100) : null;
            return (
              <div
                key={p.month}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                title={total > 0 ? `${p.month}: ${p.good} good / ${p.bad} bad (${pct}%)` : `${p.month}: no ratings`}
              >
                <span className="text-[10px] text-body-gray">{pct != null ? `${pct}%` : ""}</span>
                <div
                  className={`w-full rounded-t ${total > 0 ? "bg-brand-green" : "bg-charcoal/5"}`}
                  style={{ height: total > 0 ? `${Math.max(4, pct!)}%` : "2%" }}
                />
                <span className="text-[10px] text-body-gray">{p.month}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
