import type { CsatMonthPoint } from "@/lib/data";

// Paula's feedback: percentages read as misleading when so few tickets get
// rated at all — show the actual good/bad counts side by side instead, bar
// height scaled to the largest count across the whole year so months are
// comparable at a glance.
export function CsatMonthlyTrendChart({ points, year }: { points: CsatMonthPoint[]; year: number }) {
  const hasAnyData = points.some((p) => p.good + p.bad > 0);
  const maxCount = Math.max(1, ...points.map((p) => Math.max(p.good, p.bad)));

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
          {points.map((p) => (
            <div key={p.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t bg-brand-green"
                  style={{ height: p.good > 0 ? `${Math.max(4, (p.good / maxCount) * 100)}%` : "2px" }}
                  title={`${p.month}: ${p.good} good`}
                />
                <div
                  className="w-1/2 rounded-t bg-red-500"
                  style={{ height: p.bad > 0 ? `${Math.max(4, (p.bad / maxCount) * 100)}%` : "2px" }}
                  title={`${p.month}: ${p.bad} bad`}
                />
              </div>
              <span className="text-[9px] text-body-gray">
                {p.good + p.bad > 0 ? `${p.good}/${p.bad}` : ""}
              </span>
              <span className="text-[10px] text-body-gray">{p.month}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
