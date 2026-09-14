import type { CsatMonthPoint } from "@/lib/data";

// Paula's feedback, round 2: one stacked bar per month (green good on top of
// red bad) reads easier than two skinny side-by-side bars — still raw
// counts, not a percentage, per her first round of feedback.
export function CsatMonthlyTrendChart({ points, year }: { points: CsatMonthPoint[]; year: number }) {
  const hasAnyData = points.some((p) => p.good + p.bad > 0);
  const maxTotal = Math.max(1, ...points.map((p) => p.good + p.bad));

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-charcoal">CSAT by Month ({year})</h3>
        <div className="flex items-center gap-3 text-xs text-body-gray">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-green" /> Good
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Bad
          </span>
        </div>
      </div>
      <p className="mb-4 text-xs text-body-gray">Count of rated tickets, month by month this year.</p>

      {!hasAnyData ? (
        <p className="text-sm text-body-gray">No CSAT ratings yet this year.</p>
      ) : (
        <div className="flex h-40 items-end gap-2">
          {points.map((p) => {
            const total = p.good + p.bad;
            return (
              <div key={p.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-t"
                  style={{ height: total > 0 ? `${Math.max(4, (total / maxTotal) * 100)}%` : "2px" }}
                  title={`${p.month}: ${p.good} good / ${p.bad} bad`}
                >
                  {p.good > 0 && (
                    <div className="w-full bg-brand-green" style={{ height: `${(p.good / total) * 100}%` }} />
                  )}
                  {p.bad > 0 && (
                    <div className="w-full bg-red-500" style={{ height: `${(p.bad / total) * 100}%` }} />
                  )}
                </div>
                <span className="text-[9px] text-body-gray">{total > 0 ? total : ""}</span>
                <span className="text-[10px] text-body-gray">{p.month}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
