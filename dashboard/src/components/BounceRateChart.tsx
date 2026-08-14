import type { DomainTrendSeries } from "@/lib/domain-health";

// Categorical slots from the validated default palette (references/palette.md),
// used unmodified in fixed order — never cycled, never reassigned per filter.
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

const WIDTH = 640;
const HEIGHT = 280;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function BounceRateChart({ series }: { series: DomainTrendSeries[] }) {
  if (series.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-sm text-body-gray shadow-sm">
        No daily mailbox data yet — run the Woodpecker CSV import to populate
        this chart.
      </div>
    );
  }

  const allDates = [
    ...new Set(series.flatMap((s) => s.points.map((p) => p.date))),
  ].sort();
  const maxRate = Math.max(
    1,
    ...series.flatMap((s) => s.points.map((p) => p.bounceRate))
  );
  const yMax = Math.ceil((maxRate * 1.2) / 5) * 5 || 5;

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (date: string) => {
    const idx = allDates.indexOf(date);
    return allDates.length > 1
      ? PAD_LEFT + (idx / (allDates.length - 1)) * plotW
      : PAD_LEFT + plotW / 2;
  };
  const yFor = (rate: number) => PAD_TOP + plotH - (rate / yMax) * plotH;

  const yTicks = [0, yMax / 2, yMax];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {series.map((s, i) => (
          <div key={s.domain} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            <span className="font-semibold text-charcoal">{s.domain}</span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Bounce rate trend by sending domain"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yFor(t) + 4}
              textAnchor="end"
              fontSize={11}
              fill="#898781"
            >
              {t.toFixed(0)}%
            </text>
          </g>
        ))}

        {allDates.map((d) => (
          <text
            key={d}
            x={xFor(d)}
            y={HEIGHT - PAD_BOTTOM + 18}
            textAnchor="middle"
            fontSize={10}
            fill="#898781"
          >
            {formatDate(d)}
          </text>
        ))}

        {series.map((s, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const path = s.points
            .map(
              (p, idx) =>
                `${idx === 0 ? "M" : "L"} ${xFor(p.date)} ${yFor(p.bounceRate)}`
            )
            .join(" ");
          return (
            <g key={s.domain}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.points.map((p) => (
                <circle
                  key={p.date}
                  cx={xFor(p.date)}
                  cy={yFor(p.bounceRate)}
                  r={4}
                  fill={color}
                  stroke="#fcfcfb"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-body-gray">
        Bounce rate = (sent − delivered) / sent, per sending domain, per day.
      </p>
    </div>
  );
}
