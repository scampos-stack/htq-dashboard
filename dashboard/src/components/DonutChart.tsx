// Hand-rolled SVG donut — same no-dependency approach as BounceRateChart /
// VolumeTrendChart. Good for "share of a whole" data (source mix, carrier
// concentration, ticket status) where a bar list makes you do the division
// in your head.
const SIZE = 160;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PALETTE = [
  "#7cb342",
  "#2a78d6",
  "#fab219",
  "#8b5cf6",
  "#14b8a6",
  "#d03b3b",
  "#898781",
];

export function DonutChart({
  title,
  description,
  segments,
}: {
  title: string;
  description?: string;
  segments: { label: string; value: number; color?: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const nonZero = segments.filter((s) => s.value > 0);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-1 font-heading text-base font-semibold text-charcoal">{title}</h3>
      {description && <p className="mb-3 text-xs text-body-gray">{description}</p>}

      {total === 0 ? (
        <p className="text-sm text-body-gray">No data yet.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={title}>
            <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#e1e0d9"
                strokeWidth={STROKE}
              />
              {(() => {
                let offset = 0;
                return nonZero.map((s, i) => {
                  const fraction = s.value / total;
                  const dash = fraction * CIRCUMFERENCE;
                  const el = (
                    <circle
                      key={s.label}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      stroke={s.color ?? PALETTE[i % PALETTE.length]}
                      strokeWidth={STROKE}
                      strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += dash;
                  return el;
                });
              })()}
            </g>
            <text
              x={SIZE / 2}
              y={SIZE / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={20}
              fontWeight={700}
              fill="#2a2a28"
            >
              {total.toLocaleString()}
            </text>
          </svg>

          <div className="flex flex-col gap-2">
            {nonZero.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color ?? PALETTE[i % PALETTE.length] }}
                />
                <span className="font-semibold text-charcoal">{s.label}</span>
                <span className="text-body-gray">
                  {s.value.toLocaleString()} ({((s.value / total) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
