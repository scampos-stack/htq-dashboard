import {
  getDomainHealthOverview,
  getDomainHealthTrend,
} from "@/lib/domain-health";
import { BounceRateChart } from "@/components/BounceRateChart";
import { DomainNoteEditor } from "@/components/DomainNoteEditor";
import { DashboardHeader } from "@/components/DashboardHeader";

const STATUS = {
  good: { color: "var(--status-positive)", label: "Good" },
  warning: { color: "var(--status-warning)", label: "Watch" },
  critical: { color: "var(--status-negative)", label: "Critical" },
};

function bounceStatus(rate: number | null): keyof typeof STATUS {
  if (rate == null) return "warning";
  if (rate < 2) return "good";
  if (rate <= 5) return "warning";
  return "critical";
}

function StatTile({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: keyof typeof STATUS;
}) {
  const s = status ? STATUS[status] : null;
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-body-gray">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-heading text-3xl font-bold text-charcoal">
          {value}
        </span>
        {s && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${s.color}1A`, color: s.color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        )}
      </div>
    </div>
  );
}

function DomainTable({
  domains,
}: {
  domains: Awaited<ReturnType<typeof getDomainHealthOverview>>["domains"];
}) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">Domain</th>
            <th className="py-2 pr-4">Sent</th>
            <th className="py-2 pr-4">Delivered</th>
            <th className="py-2 pr-4">Bounce Rate</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Note</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((d) => {
            const status = bounceStatus(d.bounceRate);
            return (
              <tr key={d.domain} className="border-b border-black/5">
                <td className="py-3 pr-4 font-semibold text-charcoal">{d.domain}</td>
                <td className="py-3 pr-4">{d.sent.toLocaleString()}</td>
                <td className="py-3 pr-4">{d.delivered.toLocaleString()}</td>
                <td className="py-3 pr-4">
                  {d.bounceRate != null ? `${d.bounceRate.toFixed(1)}%` : "—"}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: STATUS[status].color }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: STATUS[status].color }}
                    />
                    {STATUS[status].label}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <DomainNoteEditor domain={d.domain} initialNote={d.note} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function DomainHealthPage() {
  const [overview, trend] = await Promise.all([
    getDomainHealthOverview(),
    getDomainHealthTrend(),
  ]);

  const overallStatus = bounceStatus(overview.overallBounceRate);
  const deliveryRate =
    overview.totalSent > 0
      ? (overview.totalDelivered / overview.totalSent) * 100
      : null;

  return (
    <div className="flex-1 bg-mist">
      <DashboardHeader active="domain-health" />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <h2 className="mb-2 font-heading text-xl font-semibold text-charcoal">
          Domain Health — Woodpecker Sending Domains
        </h2>
        {overview.earliestDate && overview.latestDate && (
          <p className="mb-6 text-sm text-body-gray">
            Data from {overview.earliestDate} to {overview.latestDate}. Woodpecker&apos;s
            live API doesn&apos;t expose per-mailbox breakdown — this comes from
            the manual CSV export and needs re-importing to extend past this
            range.
          </p>
        )}

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatTile label="Total Sent" value={overview.totalSent.toLocaleString()} />
          <StatTile
            label="Delivery Rate"
            value={deliveryRate != null ? `${deliveryRate.toFixed(1)}%` : "—"}
          />
          <StatTile
            label="Bounce Rate"
            value={
              overview.overallBounceRate != null
                ? `${overview.overallBounceRate.toFixed(1)}%`
                : "—"
            }
            status={overallStatus}
          />
        </div>

        <h3 className="mb-4 font-heading text-lg font-semibold text-charcoal">
          Bounce Rate Trend by Domain
        </h3>
        <div className="mb-8">
          <BounceRateChart series={trend} />
        </div>

        <h3 className="mb-4 font-heading text-lg font-semibold text-charcoal">
          All Sending Domains
        </h3>
        {overview.domains.length === 0 ? (
          <p className="text-body-gray">No mailbox data yet.</p>
        ) : (
          <DomainTable domains={overview.domains} />
        )}
      </main>
    </div>
  );
}
