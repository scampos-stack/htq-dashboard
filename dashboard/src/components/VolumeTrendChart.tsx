import type { DailyVolumePoint } from "@/lib/data";

// Same hand-rolled SVG approach as BounceRateChart — no charting library in
// this project, and this keeps the pattern consistent rather than adding a
// dependency for one more chart.
const SERIES = [
  { key: "sent" as const, label: "Sent", color: "#7cb342" },
  { key: "opened" as const, label: "Opened", color: "#2a78d6" },
];

const WIDTH = 640;
const HEIGHT = 240;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function VolumeTrendChart({ points }: { points: DailyVolumePoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-sm text-body-gray shadow-sm">
        No daily Woodpecker send volume yet for this range.
      </div>
    );
  }

  const maxVal = Math.max(1, ...points.flatMap((p) => [p.sent, p.opened]));
  const yMax = Math.ceil((maxVal * 1.2) / 10) * 10 || 10;

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) =>
    points.length > 1 ? PAD_LEFT + (i / (points.length - 1)) * plotW : PAD_LEFT + plotW / 2;
  const yFor = (v: number) => PAD_TOP + plotH - (v / yMax) * plotH;

  const yTicks = [0, yMax / 2, yMax];
  // Skip labels to avoid overlap when there are many days.
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-charcoal">
          Woodpecker Daily Volume
        </h3>
        <div className="flex items-center gap-4">
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-semibold text-charcoal">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Daily sent and opened volume"
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
            <text x={PAD_LEFT - 8} y={yFor(t) + 4} textAnchor="end" fontSize={11} fill="#898781">
              {t.toFixed(0)}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={p.date}
              x={xFor(i)}
              y={HEIGHT - PAD_BOTTOM + 18}
              textAnchor="middle"
              fontSize={10}
              fill="#898781"
            >
              {formatDate(p.date)}
            </text>
          ) : null
        )}

        {SERIES.map((s) => {
          const path = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p[s.key])}`)
            .join(" ");
          return (
            <g key={s.key}>
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p, i) => (
                <circle
                  key={p.date}
                  cx={xFor(i)}
                  cy={yFor(p[s.key])}
                  r={3}
                  fill={s.color}
                  stroke="#fcfcfb"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
