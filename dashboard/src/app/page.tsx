import { Suspense } from "react";
import {
  getCampaignsWithStats,
  getDailyRangeTotals,
  getSourceSummary,
  getKeapAutomations,
  getCarrierSummary,
  getKeapBroadcasts,
  getVipSubmissions,
  getChannelBlendSummary,
  getChannelBlendAutomationStats,
  getChannelBlendUploads,
  getKeapAutomationEventVolume,
  getWoodpeckerAiSummary,
  getWoodpeckerSentiment,
} from "@/lib/data";
import { RangeSelect } from "@/components/RangeSelect";
import { SourceNav } from "@/components/SourceNav";
import { StatusFilter } from "@/components/StatusFilter";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CarrierEditor } from "@/components/CarrierEditor";
import { AutomationGoalEditor } from "@/components/AutomationGoalEditor";
import { KeapBroadcastForm } from "@/components/KeapBroadcastForm";
import { ChannelBlendUpload } from "@/components/ChannelBlendUpload";
import { ChannelBlendUploadHistory } from "@/components/ChannelBlendUploadHistory";
import { EventsRangeSelect } from "@/components/EventsRangeSelect";
import { BroadcastCard } from "@/components/BroadcastCard";
import { DispositionRow } from "@/components/DispositionRow";
import { ExecutiveSummaryCard } from "@/components/ExecutiveSummaryCard";
import { SentimentBreakdown } from "@/components/SentimentBreakdown";

function StatusPill({ status }: { status: string | null }) {
  const isRunning = status === "RUNNING" || status === "PUBLISHED";
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

function CarrierSummaryTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getCarrierSummary>>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-sm text-body-gray shadow-sm">
        No carrier data yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
            <th className="py-2 pr-4">Carrier</th>
            <th className="py-2 pr-4">Sent</th>
            <th className="py-2 pr-4">Delivered</th>
            <th className="py-2 pr-4">Opens</th>
            <th className="py-2 pr-4">Open Rate</th>
            <th className="py-2 pr-4">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.carrier} className="border-b border-black/5">
              <td className="py-3 pr-4 font-semibold text-charcoal">{r.carrier}</td>
              <td className="py-3 pr-4">{r.sent.toLocaleString()}</td>
              <td className="py-3 pr-4">{r.delivered.toLocaleString()}</td>
              <td className="py-3 pr-4">{r.opened.toLocaleString()}</td>
              <td className="py-3 pr-4">{pct(r.opened, r.delivered)}</td>
              <td className="py-3 pr-4">{r.clicked.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeapAutomationEventVolumeTable({
  events,
}: {
  events: Awaited<ReturnType<typeof getKeapAutomationEventVolume>>;
}) {
  const byAutomation = new Map<string, Map<string, number>>();
  const eventTypes = new Set<string>();
  for (const e of events) {
    eventTypes.add(e.eventType);
    const row = byAutomation.get(e.automationName) ?? new Map();
    row.set(e.eventType, e.count);
    byAutomation.set(e.automationName, row);
  }
  const types = [...eventTypes];

  return (
    <div className="mb-6 overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-charcoal">
          Automation Event Volume — By Automation
        </h3>
        <Suspense fallback={null}>
          <EventsRangeSelect />
        </Suspense>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-body-gray">
          No automation events in this range. This fills in once Keap&apos;s
          automation steps are configured to call{" "}
          <code className="rounded bg-charcoal/5 px-1">/api/webhooks/keap</code>{" "}
          — Keap&apos;s API has no way to pull this after the fact, so it only
          populates going forward.
        </p>
      ) : (
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
              <th className="py-2 pr-4">Automation</th>
              {types.map((t) => (
                <th key={t} className="py-2 pr-4">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...byAutomation.entries()].map(([name, row]) => (
              <tr key={name} className="border-b border-black/5">
                <td className="py-3 pr-4 font-semibold text-charcoal">{name}</td>
                {types.map((t) => (
                  <td key={t} className="py-3 pr-4">
                    {(row.get(t) ?? 0).toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  automation_lead_marketing: "Lead Marketing",
  automation_customer_comms: "Customer / Comms",
  uncategorized: "Uncategorized",
};

function KeapAutomationsList({
  automations,
}: {
  automations: Awaited<ReturnType<typeof getKeapAutomations>>;
}) {
  if (automations.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-sm text-body-gray shadow-sm">
        No Keap automations synced yet — click &quot;Sync Now&quot; above.
      </div>
    );
  }

  const byCategory = new Map<string, typeof automations>();
  for (const a of automations) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }

  return (
    <div className="space-y-6">
      {[...byCategory.entries()].map(([category, list]) => (
        <div key={category} className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
            {CATEGORY_LABELS[category] ?? category}{" "}
            <span className="font-normal text-body-gray">({list.length})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
                  <th className="py-2 pr-4">Automation</th>
                  <th className="py-2 pr-4">Has Email</th>
                  <th className="py-2 pr-4">Carrier</th>
                  <th className="py-2 pr-4">Goal</th>
                  <th className="py-2 pr-4">Active Contacts</th>
                  <th className="py-2 pr-4">Completed Contacts</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-b border-black/5 ${
                      a.excludeFromMetrics ? "opacity-60" : ""
                    }`}
                  >
                    <td className="py-3 pr-4 font-semibold text-charcoal">
                      {a.name}
                      {a.excludeFromMetrics && (
                        <span className="ml-2 rounded-full bg-charcoal/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-body-gray">
                          Excluded
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="py-3 pr-4">
                      <CarrierEditor campaignId={a.id} carrier={a.carrier} />
                    </td>
                    <td className="py-3 pr-4">
                      <AutomationGoalEditor
                        campaignId={a.id}
                        category={a.category}
                        excludeFromMetrics={a.excludeFromMetrics}
                      />
                    </td>
                    <td className="py-3 pr-4">{a.activeContacts.toLocaleString()}</td>
                    <td className="py-3 pr-4">{a.completedContacts.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="text-xs text-body-gray">
        Category/Goal is a first-pass keyword guess (no native field from
        Keap) — review and correct as needed. &quot;Has Email&quot; reflects
        whether the automation is published (actively sending), not
        per-email open/click stats — Keap&apos;s API doesn&apos;t expose
        those for automations. Automations marked &quot;Exclude from
        conversion metrics&quot; are left out of the By Carrier and All
        Sources rollups (e.g. HTQ University, which isn&apos;t a
        conversion-focused automation).
      </p>
    </div>
  );
}

function KeapBroadcastsList({
  broadcasts,
}: {
  broadcasts: Awaited<ReturnType<typeof getKeapBroadcasts>>;
}) {
  return (
    <div>
      <KeapBroadcastForm />
      {broadcasts.length === 0 ? (
        <p className="text-body-gray">
          No broadcasts logged yet — Keap&apos;s API doesn&apos;t expose
          broadcast performance, so add them here manually.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {broadcasts.map((b) => (
            <BroadcastCard key={b.id} broadcast={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelBlendSection({
  summary,
  automationStats,
  uploads,
}: {
  summary: Awaited<ReturnType<typeof getChannelBlendSummary>>;
  automationStats: Awaited<ReturnType<typeof getChannelBlendAutomationStats>>;
  uploads: Awaited<ReturnType<typeof getChannelBlendUploads>>;
}) {
  return (
    <div>
      <ChannelBlendUpload />

      <ChannelBlendUploadHistory uploads={uploads} />

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-3xl border-l-4 border-violet-500 bg-white p-6 shadow-sm">
          <Metric label="Total Rows" value={summary.totalRows.toLocaleString()} />
        </div>
        <div className="rounded-3xl border-l-4 border-violet-500 bg-white p-6 shadow-sm">
          <Metric
            label="Appointments Booked"
            value={summary.appointmentsBooked.toLocaleString()}
          />
        </div>
        <div className="rounded-3xl border-l-4 border-amber-500 bg-white p-6 shadow-sm">
          <Metric
            label="Follow-up Emails Sent"
            value={automationStats.totalEmailsSent.toLocaleString()}
          />
        </div>
      </div>

      {automationStats.recentEvents.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
            Recent Follow-up Emails (Channel Blend → Keap Automation)
          </h3>
          <table className="w-full min-w-[320px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
                <th className="py-2 pr-4">Contact Email</th>
                <th className="py-2 pr-4">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {automationStats.recentEvents.map((e, i) => (
                <tr key={i} className="border-b border-black/5">
                  <td className="py-3 pr-4">{e.contactEmail ?? "—"}</td>
                  <td className="py-3 pr-4 text-body-gray">
                    {new Date(e.occurredAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-body-gray">
            From the &quot;Channel Blend - Email Request&quot; automation&apos;s
            webhook step — ties a spreadsheet email request to the actual send.
          </p>
        </div>
      )}

      {summary.byCategory.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
            Breakdown by Category
          </h3>
          <table className="w-full min-w-[320px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Count</th>
              </tr>
            </thead>
            <tbody>
              {summary.byCategory.map((c) => (
                <tr key={c.category} className="border-b border-black/5">
                  <td className="py-3 pr-4 font-semibold text-charcoal">{c.category}</td>
                  <td className="py-3 pr-4">{c.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary.recent.length > 0 && (
        <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
            Recent Entries
          </h3>
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Lead</th>
                <th className="py-2 pr-4">State</th>
                <th className="py-2 pr-4">Details</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent.map((r) => (
                <DispositionRow key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VipSubmissionsWidget({
  submissions,
}: {
  submissions: Awaited<ReturnType<typeof getVipSubmissions>>;
}) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      {submissions.length === 0 ? (
        <p className="text-sm text-body-gray">No VIP form submissions yet.</p>
      ) : (
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
              <th className="py-2 pr-4">Submission Date</th>
              <th className="py-2 pr-4">Contact Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Form Details</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.contactId} className="border-b border-black/5">
                <td className="py-3 pr-4">
                  {new Date(s.dateApplied).toLocaleDateString()}
                </td>
                <td className="py-3 pr-4 font-semibold text-charcoal">{s.name}</td>
                <td className="py-3 pr-4">{s.email ?? "—"}</td>
                <td className="py-3 pr-4 text-body-gray">{s.formDetails}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
  const keapStatusParam =
    typeof params.keapStatus === "string" ? params.keapStatus : "all";
  const wpStatusParam =
    typeof params.wpStatus === "string" ? params.wpStatus : "all";
  const eventsRangeParam =
    typeof params.eventsRange === "string" ? params.eventsRange : "30";
  const eventsFromParam =
    typeof params.eventsFrom === "string" ? params.eventsFrom : "";
  const eventsToParam =
    typeof params.eventsTo === "string" ? params.eventsTo : "";

  const eventsRange =
    eventsRangeParam === "custom" && eventsFromParam
      ? {
          since: new Date(eventsFromParam),
          until: eventsToParam ? new Date(eventsToParam) : undefined,
        }
      : (() => {
          const since = new Date();
          since.setDate(since.getDate() - Number(eventsRangeParam || "30"));
          return { since };
        })();

  const [
    allCampaigns,
    sourceSummary,
    carrierSummary,
    allKeapAutomations,
    keapBroadcasts,
    vipSubmissions,
    channelBlendSummary,
    channelBlendAutomationStats,
    channelBlendUploads,
    keapAutomationEvents,
    woodpeckerAiSummary,
    woodpeckerSentiment,
    rangeTotals,
  ] = await Promise.all([
    getCampaignsWithStats(),
    getSourceSummary(),
    getCarrierSummary(),
    getKeapAutomations(),
    getKeapBroadcasts(),
    getVipSubmissions(),
    getChannelBlendSummary(),
    getChannelBlendAutomationStats(),
    getChannelBlendUploads(),
    getKeapAutomationEventVolume(eventsRange),
    getWoodpeckerAiSummary(),
    getWoodpeckerSentiment(),
    rangeParam === "all" ? null : getDailyRangeTotals(Number(rangeParam)),
  ]);

  const wpStatusOptions = [...new Set(allCampaigns.map((c) => c.status).filter(Boolean))] as string[];
  const keapStatusOptions = [...new Set(allKeapAutomations.map((a) => a.status).filter(Boolean))] as string[];

  const campaigns =
    wpStatusParam === "all"
      ? allCampaigns
      : allCampaigns.filter((c) => c.status === wpStatusParam);
  const keapAutomations =
    keapStatusParam === "all"
      ? allKeapAutomations
      : allKeapAutomations.filter((a) => a.status === keapStatusParam);

  const showAll = sourceParam === "all";
  const showWoodpecker = showAll || sourceParam === "woodpecker";
  const showKeapAutomations = showAll || sourceParam === "keap_automations";
  const showKeapBroadcasts = showAll || sourceParam === "keap_broadcasts";
  const showChannelBlend = showAll || sourceParam === "channel_blend";

  return (
    <div className="flex-1 bg-mist">
      <DashboardHeader active="client" />

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

          {showAll && (
            <SectionBlock title="By Carrier" accent="border-charcoal">
              <CarrierSummaryTable rows={carrierSummary} />
            </SectionBlock>
          )}

          {showAll && (
            <SectionBlock title="VIP Form Submissions" accent="border-charcoal">
              <VipSubmissionsWidget submissions={vipSubmissions} />
            </SectionBlock>
          )}

          {showKeapAutomations && (
            <SectionBlock title="Keap Automations" accent="border-amber-500">
              {keapStatusOptions.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <Suspense fallback={null}>
                    <StatusFilter
                      paramName="keapStatus"
                      options={keapStatusOptions}
                      label="Status"
                    />
                  </Suspense>
                </div>
              )}
              <KeapAutomationEventVolumeTable events={keapAutomationEvents} />
              <KeapAutomationsList automations={keapAutomations} />
            </SectionBlock>
          )}

          {showKeapBroadcasts && (
            <SectionBlock title="Keap Broadcasts" accent="border-sky-500">
              <KeapBroadcastsList broadcasts={keapBroadcasts} />
            </SectionBlock>
          )}

          {showChannelBlend && (
            <SectionBlock title="Channel Blend" accent="border-violet-500">
              <ChannelBlendSection
                summary={channelBlendSummary}
                automationStats={channelBlendAutomationStats}
                uploads={channelBlendUploads}
              />
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
              <ExecutiveSummaryCard summary={woodpeckerAiSummary} />
              <SentimentBreakdown sentiment={woodpeckerSentiment} />
              <div className="mb-4 flex flex-wrap justify-end gap-3">
                {wpStatusOptions.length > 0 && (
                  <Suspense fallback={null}>
                    <StatusFilter
                      paramName="wpStatus"
                      options={wpStatusOptions}
                      label="Status"
                    />
                  </Suspense>
                )}
                {!showAll && (
                  <Suspense fallback={null}>
                    <RangeSelect />
                  </Suspense>
                )}
              </div>
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
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h3 className="font-heading text-lg font-semibold text-charcoal">
                            {c.name}
                          </h3>
                          <StatusPill status={c.status} />
                        </div>
                        <div className="mb-4">
                          <CarrierEditor campaignId={c.id} carrier={c.carrier} />
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
                          {rangeStats ? (
                            <Metric label="Responded" value="—" />
                          ) : (
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2 text-sm font-bold text-charcoal font-heading">
                                <span className="text-[#0ca30c]">
                                  {(c.stats?.interested_yes ?? 0).toLocaleString()}
                                </span>
                                <span className="text-[#fab219]">
                                  {(c.stats?.interested_maybe ?? 0).toLocaleString()}
                                </span>
                                <span className="text-[#d03b3b]">
                                  {(c.stats?.interested_no ?? 0).toLocaleString()}
                                </span>
                              </span>
                              <span className="text-xs uppercase tracking-wide text-body-gray">
                                Pos / Neu / Neg
                              </span>
                            </div>
                          )}
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
