import { Suspense } from "react";
import {
  getCampaignsWithStats,
  getDailyRangeTotals,
  getSourceSummary,
  getKeapAutomationsSummary,
} from "@/lib/data";
import { RangeSelect } from "@/components/RangeSelect";
import { SyncButton } from "@/components/SyncButton";
import { SourceNav } from "@/components/SourceNav";

function StatusPill({ status }: { status: string | null }) {
  const isRunning = status === "RUNNING";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        isRunning
          ? "bg-brand-green/15 text-brand-green-dark"
          : "bg-charcoal/10 text-charcoal"
      }`}
    >
      {status ?? "UNKNOWN"}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-charcoal font-heading">{value}</span>
      <span className="text-xs uppercase tracking-wide text-body-gray">{label}</span>
    </div>
  );
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function SectionBlock({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className={`mb-4 flex items-center gap-2 border-l-4 ${accent} pl-3`}>
        <h2 className="font-heading text-xl font-semibold text-charcoal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SourceSummaryTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getSourceSummary>>;
}) {
  const grandTotal = rows.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      delivered: acc.delivered + r.delivered,
      opened: acc.opened + r.opened,
      clicked: acc.clicked + r.clicked,
    }),
    { sent: 0, delivered: 0, opened: 0, clicked: 0 }
  );

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">Source</th>
            <th className="py-2 pr-4">Sent</th>
            <th className="py-2 pr-4">Delivered</th>
            <th className="py-2 pr-4">Opens</th>
            <th className="py-2 pr-4">Open Rate</th>
            <th className="py-2 pr-4">Clicks</th>
            <th className="py-2 pr-4">CTR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-black/5">
              <td className="py-3 pr-4 font-semibold text-charcoal">
                {r.label}
                {!r.connected && (
                  <span className="ml-2 rounded-full bg-charcoal/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-body-gray">
                    Not connected
                  </span>
                )}
              </td>
              <td className="py-3 pr-4">{r.connected ? r.sent.toLocaleString() : "—"}</td>
              <td className="py-3 pr-4">
                {r.connected ? r.delivered.toLocaleString() : "—"}
              </td>
              <td className="py-3 pr-4">{r.connected ? r.opened.toLocaleString() : "—"}</td>
              <td className="py-3 pr-4">
                {r.connected ? pct(r.opened, r.delivered) : "—"}
              </td>
              <td className="py-3 pr-4">{r.connected ? r.clicked.toLocaleString() : "—"}</td>
              <td className="py-3 pr-4">
                {r.connected ? pct(r.clicked, r.delivered) : "—"}
              </td>
            </tr>
          ))}
          <tr className="font-bold text-charcoal">
            <td className="py-3 pr-4">Grand Total</td>
            <td className="py-3 pr-4">{grandTotal.sent.toLocaleString()}</td>
            <td className="py-3 pr-4">{grandTotal.delivered.toLocaleString()}</td>
            <td className="py-3 pr-4">{grandTotal.opened.toLocaleString()}</td>
            <td className="py-3 pr-4">{pct(grandTotal.opened, grandTotal.delivered)}</td>
            <td className="py-3 pr-4">{grandTotal.clicked.toLocaleString()}</td>
            <td className="py-3 pr-4">{pct(grandTotal.clicked, grandTotal.delivered)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function KeapAutomationsTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getKeapAutomationsSummary>>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-sm text-body-gray shadow-sm">
        No Keap automations synced yet — click &quot;Sync Now&quot; above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Automations</th>
            <th className="py-2 pr-4">Active Contacts</th>
            <th className="py-2 pr-4">Completed Contacts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category} className="border-b border-black/5">
              <td className="py-3 pr-4 font-semibold text-charcoal">{r.label}</td>
              <td className="py-3 pr-4">{r.automationCount}</td>
              <td className="py-3 pr-4">{r.activeContacts.toLocaleString()}</td>
              <td className="py-3 pr-4">{r.completedContacts.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-body-gray">
        Category is a first-pass keyword guess (no native field from Keap) —
        review and correct as needed. Keap&apos;s API doesn&apos;t expose
        per-email open/click stats for automations, only contact-flow volume.
      </p>
    </div>
  );
}

function KeapBroadcastsPlaceholder() {
  return (
    <div className="rounded-3xl bg-white p-6 text-sm text-body-gray shadow-sm">
      Not connected yet — Keap broadcast (one-off email) stats aren&apos;t wired
      up. This block is reserved for that once it&apos;s built.
    </div>
  );
}

export default async function Home({
  searchParams,
}: PageProps<"/">) {
  const params = await searchParams;
  const rangeParam = typeof params.range === "string" ? params.range : "all";
  const sourceParam =
    typeof params.source === "string" ? params.source : "all";

  const [campaigns, sourceSummary, keapSummary, rangeTotals] = await Promise.all([
    getCampaignsWithStats(),
    getSourceSummary(),
    getKeapAutomationsSummary(),
    rangeParam === "all" ? null : getDailyRangeTotals(Number(rangeParam)),
  ]);

  const showAll = sourceParam === "all";
  const showWoodpecker = showAll || sourceParam === "woodpecker";
  const showKeapAutomations = showAll || sourceParam === "keap_automations";
  const showKeapBroadcasts = showAll || sourceParam === "keap_broadcasts";

  return (
    <div className="flex-1 bg-mist">
      <header className="flex items-start justify-between gap-4 border-b border-black/5 bg-white px-6 py-6 sm:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-body-gray">
            Marketing Dashboard
          </p>
          <h1 className="font-heading text-3xl font-bold">
            <span className="text-brand-green">HOMETOWN</span>
            <span className="text-charcoal">QUOTES</span>
          </h1>
        </div>
        <SyncButton />
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:px-10">
        <Suspense fallback={null}>
          <SourceNav />
        </Suspense>

        <main className="min-w-0 flex-1">
          {showAll && (
            <SectionBlock title="All Sources — Overview" accent="border-charcoal">
              <div className="mb-4 flex justify-end">
                <Suspense fallback={null}>
                  <RangeSelect />
                </Suspense>
              </div>
              <SourceSummaryTable rows={sourceSummary} />
            </SectionBlock>
          )}

          {showKeapAutomations && (
            <SectionBlock title="Keap Automations" accent="border-amber-500">
              <KeapAutomationsTable rows={keapSummary} />
            </SectionBlock>
          )}

          {showKeapBroadcasts && (
            <SectionBlock title="Keap Broadcasts" accent="border-sky-500">
              <KeapBroadcastsPlaceholder />
            </SectionBlock>
          )}

          {showWoodpecker && (
            <SectionBlock
              title={
                rangeTotals
                  ? `Woodpecker Campaigns (last ${rangeParam} days)`
                  : "Woodpecker Campaigns"
              }
              accent="border-brand-green"
            >
              {!showAll && (
                <div className="mb-4 flex justify-end">
                  <Suspense fallback={null}>
                    <RangeSelect />
                  </Suspense>
                </div>
              )}
              {campaigns.length === 0 ? (
                <p className="text-body-gray">
                  No campaigns yet — run the import scripts to load Woodpecker
                  data.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {campaigns.map((c) => {
                    const rangeStats = rangeTotals?.get(c.id);
                    const sent = rangeStats ? rangeStats.sent : c.stats?.sent ?? 0;
                    const delivered = rangeStats
                      ? rangeStats.delivered
                      : c.stats?.delivered ?? 0;
                    const opened = rangeStats
                      ? rangeStats.opened
                      : c.stats?.opened ?? 0;
                    const openRate = rangeStats
                      ? pct(opened, delivered)
                      : c.stats?.opened_rate != null
                      ? `${c.stats.opened_rate}%`
                      : "—";

                    return (
                      <div
                        key={c.id}
                        className="rounded-3xl border-l-4 border-brand-green bg-white p-6 shadow-sm"
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <h3 className="font-heading text-lg font-semibold text-charcoal">
                            {c.name}
                          </h3>
                          <StatusPill status={c.status} />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <Metric label="Sent" value={sent.toLocaleString()} />
                          <Metric label="Open rate" value={openRate} />
                          <Metric
                            label="Clicked"
                            value={
                              rangeStats
                                ? "—"
                                : (c.stats?.clicked ?? 0).toLocaleString()
                            }
                          />
                          <Metric
                            label="Delivered"
                            value={delivered.toLocaleString()}
                          />
                          <Metric
                            label="Bounce rate"
                            value={
                              rangeStats
                                ? "—"
                                : c.stats?.bounce_rate != null
                                ? `${c.stats.bounce_rate}%`
                                : "—"
                            }
                          />
                          <Metric
                            label="Responded"
                            value={
                              rangeStats
                                ? "—"
                                : (c.stats?.responded ?? 0).toLocaleString()
                            }
                          />
                        </div>

                        {c.stats && !rangeStats && (
                          <p className="mt-4 text-xs text-body-gray">
                            Last pulled{" "}
                            {new Date(c.stats.pulled_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionBlock>
          )}
        </main>
      </div>
    </div>
  );
}
