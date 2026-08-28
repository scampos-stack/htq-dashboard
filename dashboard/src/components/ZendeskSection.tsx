import type { ZendeskSummary } from "@/lib/data";
import { ExpandableBreakdownTable } from "@/components/ExpandableBreakdownTable";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-charcoal font-heading">{value}</span>
      <span className="text-xs uppercase tracking-wide text-body-gray">{label}</span>
    </div>
  );
}

export function ZendeskSection({ summary }: { summary: ZendeskSummary }) {
  if (summary.totalRows === 0) {
    return (
      <p className="text-body-gray">
        No Zendesk tickets synced yet — click &quot;Sync Now&quot; to pull the last 90
        days.
      </p>
    );
  }

  const csatTotal = summary.csat.good + summary.csat.bad;

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-3xl border-l-4 border-sky-500 bg-white p-6 shadow-sm">
          <Metric label="Total Tickets" value={summary.totalRows.toLocaleString()} />
        </div>
        <div className="rounded-3xl border-l-4 border-sky-500 bg-white p-6 shadow-sm">
          <Metric
            label="Open / Pending"
            value={(
              (summary.byStatus.find((s) => s.status === "open")?.count ?? 0) +
              (summary.byStatus.find((s) => s.status === "pending")?.count ?? 0)
            ).toLocaleString()}
          />
        </div>
        <div className="rounded-3xl border-l-4 border-amber-500 bg-white p-6 shadow-sm">
          <Metric
            label="CSAT (Good)"
            value={csatTotal > 0 ? `${Math.round((summary.csat.good / csatTotal) * 100)}%` : "—"}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ExpandableBreakdownTable
          title="Tickets by Status"
          columnLabel="Status"
          rows={summary.byStatus.map((s) => ({ label: s.status, count: s.count }))}
        />
        {summary.topTags.length > 0 && (
          <ExpandableBreakdownTable
            title="Top Tags"
            columnLabel="Tag"
            rows={summary.topTags.map((t) => ({ label: t.tag, count: t.count }))}
          />
        )}
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
          Recent Tickets
        </h3>
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
              <th className="py-2 pr-4">Subject</th>
              <th className="py-2 pr-4">Requester</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Priority</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {summary.recent.map((t) => (
              <tr key={t.id} className="border-b border-black/5">
                <td className="py-3 pr-4 max-w-xs truncate font-semibold text-charcoal" title={t.subject ?? ""}>
                  {t.subject ?? "—"}
                </td>
                <td className="py-3 pr-4">{t.requesterEmail ?? "—"}</td>
                <td className="py-3 pr-4">{t.status ?? "—"}</td>
                <td className="py-3 pr-4">{t.priority ?? "—"}</td>
                <td className="py-3 pr-4 text-body-gray">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
