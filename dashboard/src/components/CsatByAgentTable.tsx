import type { CsatAgentStat } from "@/lib/data";

// Sorted by total rated tickets (not good%) so an agent with 2 ratings and a
// 100% good rate doesn't outrank one with 50 ratings and 90% — sample size
// matters here, and burying it behind a percentage-only sort would be
// misleading.
export function CsatByAgentTable({ rows }: { rows: CsatAgentStat[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="font-heading text-base font-semibold text-charcoal">CSAT by Agent</h3>
        <p className="mt-2 text-sm text-body-gray">No rated tickets yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-1 font-heading text-base font-semibold text-charcoal">CSAT by Agent</h3>
      <p className="mb-4 text-xs text-body-gray">Sorted by number of rated tickets, not percentage — small samples can swing wildly.</p>
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">Agent</th>
            <th className="py-2 pr-4">Good</th>
            <th className="py-2 pr-4">Bad</th>
            <th className="py-2 pr-4">Good %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = r.good + r.bad;
            const pct = total > 0 ? Math.round((r.good / total) * 100) : null;
            return (
              <tr key={r.agent} className="border-b border-black/5">
                <td className="py-3 pr-4 font-semibold text-charcoal">{r.agent}</td>
                <td className="py-3 pr-4">{r.good.toLocaleString()}</td>
                <td className="py-3 pr-4">{r.bad.toLocaleString()}</td>
                <td className="py-3 pr-4">{pct != null ? `${pct}%` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
