import { Suspense } from "react";
import {
  getCampaignsWithStats,
  getDailyRangeTotals,
  getSourceSummary,
  getKeapAutomations,
  getDormantKeapAutomations,
  getCarrierSummary,
  getKeapBroadcasts,
  getVipSubmissions,
  getChannelBlendSummary,
  getChannelBlendAutomationStats,
  getChannelBlendUploads,
  getChannelBlendCategoryPatterns,
  getZendeskSummary,
  getZendeskFilterOptions,
  getJustCallSummary,
  getZendeskTopicsSummary,
  getAllSourcesDigest,
  getDailyVolumeTrend,
  getKeapAutomationEventVolume,
  getWoodpeckerAiSummary,
  getWoodpeckerSentiment,
} from "@/lib/data";
import { RangeSelect } from "@/components/RangeSelect";
import { ArrangementTabs } from "@/components/ArrangementTabs";
import { StatusFilter } from "@/components/StatusFilter";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CarrierEditor } from "@/components/CarrierEditor";
import { AutomationGoalEditor } from "@/components/AutomationGoalEditor";
import { LogBroadcastButton } from "@/components/LogBroadcastButton";
import { UploadChannelBlendButton } from "@/components/UploadChannelBlendButton";
import { ChannelBlendUploadHistory } from "@/components/ChannelBlendUploadHistory";
import { ChannelBlendPatternsCard } from "@/components/ChannelBlendPatternsCard";
import { HorizontalBarList } from "@/components/HorizontalBarList";
import { VerticalBarChart } from "@/components/VerticalBarChart";
import { DonutChart } from "@/components/DonutChart";
import { Collapsible } from "@/components/Collapsible";
import { JumpNav } from "@/components/JumpNav";
import { CampaignStepBreakdown } from "@/components/CampaignStepBreakdown";
import { CampaignEmailContent } from "@/components/CampaignEmailContent";
import { CampaignProspectsPanel } from "@/components/CampaignProspectsPanel";
import { ZendeskSection } from "@/components/ZendeskSection";
import { JustCallSection } from "@/components/JustCallSection";
import { AllSourcesDigestCard } from "@/components/AllSourcesDigestCard";
import { VolumeTrendChart } from "@/components/VolumeTrendChart";
import { SectionTabs } from "@/components/SectionTabs";
import { Metric } from "@/components/Metric";
import { ZendeskRangeSelect } from "@/components/ZendeskRangeSelect";
import { EventsRangeSelect } from "@/components/EventsRangeSelect";
import { BroadcastCard } from "@/components/BroadcastCard";
import { DispositionRow } from "@/components/DispositionRow";
import { ExecutiveSummaryCard } from "@/components/ExecutiveSummaryCard";
import { SentimentBreakdown } from "@/components/SentimentBreakdown";
import { OPEN_RATE_CAVEAT } from "@/lib/open-rate-caveat";

function StatusPill({ status }: { status: string | null }) {
  const isRunning = status === "RUNNING" || status === "PUBLISHED";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        isRunning
          ? "bg-brand-green/15 text-brand-green-dark"
          : "bg-charcoal/10 text-charcoal"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isRunning ? "bg-brand-green-dark" : "bg-body-gray"
        }`}
      />
      {status ?? "UNKNOWN"}
    </span>
  );
}


function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

// Marks a group of modules as manually-logged data vs. auto-synced
// performance numbers — Sarah's feedback: mixing "someone typed this in" with
// "the API reported this" in the same unlabeled row makes the manual entries
// read as if they carry the same reliability as synced metrics.
function GroupDivider({ label }: { label: string }) {
  return (
    <div className="mb-6 mt-2 flex items-center gap-3">
      <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-body-gray">
        {label}
      </span>
      <div className="h-px flex-1 bg-black/10" />
    </div>
  );
}

function SectionBlock({
  id,
  title,
  accent,
  children,
}: {
  id?: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <div className={`mb-4 flex items-center gap-2 border-l-4 ${accent} pl-3`}>
        <h2 className="font-heading text-xl font-semibold text-charcoal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SourceSummaryTable({
  rows: allRows,
}: {
  rows: Awaited<ReturnType<typeof getSourceSummary>>;
}) {
  // Not-connected sources are all-zero placeholder rows — nothing to read,
  // just dead weight in a table meant to be scanned quickly.
  const rows = allRows.filter((r) => r.connected);
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
            <th className="py-2 pr-4" title={OPEN_RATE_CAVEAT}>
              Open Rate*
            </th>
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
            <th className="py-2 pr-4" title={OPEN_RATE_CAVEAT}>
              Open Rate*
            </th>
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
          <div className="max-h-72 overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead className="sticky top-0 bg-white">
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
      <div className="mb-4 flex justify-end">
        <LogBroadcastButton />
      </div>
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
  patterns,
}: {
  summary: Awaited<ReturnType<typeof getChannelBlendSummary>>;
  automationStats: Awaited<ReturnType<typeof getChannelBlendAutomationStats>>;
  uploads: Awaited<ReturnType<typeof getChannelBlendUploads>>;
  patterns: Awaited<ReturnType<typeof getChannelBlendCategoryPatterns>>;
}) {
  const overviewTab = (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border-l-4 border-violet-500 bg-white p-4 shadow-sm">
          <Metric label="Total Rows" value={summary.totalRows.toLocaleString()} />
        </div>
        <div className="rounded-3xl border-l-4 border-violet-500 bg-white p-4 shadow-sm">
          <Metric
            label="Appointments Booked"
            value={summary.appointmentsBooked.toLocaleString()}
          />
        </div>
        <div className="rounded-3xl border-l-4 border-amber-500 bg-white p-4 shadow-sm">
          <Metric
            label="Follow-up Emails Sent"
            value={automationStats.totalEmailsSent.toLocaleString()}
          />
        </div>
      </div>

      <div className="mb-4">
        <ChannelBlendPatternsCard patterns={patterns} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {summary.byCategory.length > 0 && (
          <HorizontalBarList
            title="Breakdown by Category"
            accent="bg-violet-500"
            rows={summary.byCategory.map((c) => ({ label: c.category, count: c.count }))}
          />
        )}

        {summary.byState.length > 0 && (
          <HorizontalBarList
            title="Leads by State"
            accent="bg-violet-500"
            rows={summary.byState.map((s) => ({ label: s.state, count: s.count }))}
          />
        )}

        {summary.byCarrier.length > 0 && (
          <DonutChart
            title="Leads by Carrier"
            description="Derived from the agent's email domain (e.g. @farmersagent.com → Farmers)."
            segments={summary.byCarrier.map((c) => ({ label: c.carrier, value: c.count }))}
          />
        )}
      </div>

      {automationStats.recentEvents.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-heading text-sm font-semibold text-charcoal">
            Recent Follow-up Emails (Channel Blend → Keap Automation)
          </h3>
          <table className="w-full min-w-[320px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
                <th className="py-1.5 pr-4">Contact Email</th>
                <th className="py-1.5 pr-4">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {automationStats.recentEvents.slice(0, 5).map((e, i) => (
                <tr key={i} className="border-b border-black/5">
                  <td className="py-1.5 pr-4">{e.contactEmail ?? "—"}</td>
                  <td className="py-1.5 pr-4 text-body-gray">
                    {new Date(e.occurredAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const uploadTab = (
    <div>
      <div className="mb-4 flex justify-end">
        <UploadChannelBlendButton />
      </div>
      <ChannelBlendUploadHistory uploads={uploads} />
    </div>
  );

  const entriesTab = summary.recent.length > 0 && (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
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
  );

  return (
    <SectionTabs
      accent="border-violet-500"
      tabs={[
        { label: "Overview", content: overviewTab },
        { label: "Upload", content: uploadTab },
        { label: "Recent Entries", content: entriesTab },
      ]}
    />
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
  const arrangementParam =
    typeof params.arrangement === "string" ? params.arrangement : "overview";
  // Defaults to Published only — Sam's review flagged unpublished
  // automations as noise cluttering the list; "all" is still one click away.
  const keapStatusParam =
    typeof params.keapStatus === "string" ? params.keapStatus : "PUBLISHED";
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

  const zendeskRangeParam =
    typeof params.zendeskRange === "string" ? params.zendeskRange : "30";
  const zendeskFromParam =
    typeof params.zendeskFrom === "string" ? params.zendeskFrom : "";
  const zendeskToParam =
    typeof params.zendeskTo === "string" ? params.zendeskTo : "";

  const zendeskRange =
    zendeskRangeParam === "custom" && zendeskFromParam
      ? {
          since: new Date(zendeskFromParam),
          until: zendeskToParam ? new Date(zendeskToParam) : undefined,
        }
      : (() => {
          const since = new Date();
          since.setDate(since.getDate() - Number(zendeskRangeParam || "30"));
          return { since };
        })();

  const zendeskGroupParam =
    typeof params.zendeskGroup === "string" ? params.zendeskGroup : "all";
  const zendeskAssigneeParam =
    typeof params.zendeskAssignee === "string" ? params.zendeskAssignee : "all";

  const justcallRangeParam =
    typeof params.justcallRange === "string" ? params.justcallRange : "30";
  const justcallFromParam =
    typeof params.justcallFrom === "string" ? params.justcallFrom : "";
  const justcallToParam =
    typeof params.justcallTo === "string" ? params.justcallTo : "";

  const justcallRange =
    justcallRangeParam === "all"
      ? undefined
      : justcallRangeParam === "custom" && justcallFromParam
      ? {
          since: new Date(justcallFromParam),
          until: justcallToParam ? new Date(justcallToParam) : undefined,
        }
      : (() => {
          const since = new Date();
          since.setDate(since.getDate() - Number(justcallRangeParam || "30"));
          return { since };
        })();

  const [
    allCampaigns,
    sourceSummary,
    carrierSummary,
    allKeapAutomations,
    dormantKeapAutomations,
    keapBroadcasts,
    vipSubmissions,
    channelBlendSummary,
    channelBlendAutomationStats,
    channelBlendUploads,
    channelBlendPatterns,
    zendeskSummary,
    zendeskFilterOptions,
    justCallSummary,
    zendeskTopicsSummary,
    allSourcesDigest,
    keapAutomationEvents,
    woodpeckerAiSummary,
    woodpeckerSentiment,
    rangeTotals,
    volumeTrend,
  ] = await Promise.all([
    getCampaignsWithStats(),
    getSourceSummary(),
    getCarrierSummary(),
    getKeapAutomations(),
    getDormantKeapAutomations(),
    getKeapBroadcasts(),
    getVipSubmissions(),
    getChannelBlendSummary(),
    getChannelBlendAutomationStats(),
    getChannelBlendUploads(),
    getChannelBlendCategoryPatterns(),
    getZendeskSummary(
      zendeskRange,
      zendeskGroupParam === "all" ? undefined : zendeskGroupParam,
      zendeskAssigneeParam === "all" ? undefined : zendeskAssigneeParam
    ),
    getZendeskFilterOptions(),
    getJustCallSummary(justcallRange),
    getZendeskTopicsSummary(),
    getAllSourcesDigest(),
    getKeapAutomationEventVolume(eventsRange),
    getWoodpeckerAiSummary(),
    getWoodpeckerSentiment(),
    rangeParam === "all" ? null : getDailyRangeTotals(Number(rangeParam)),
    getDailyVolumeTrend(rangeParam === "all" ? 30 : Number(rangeParam)),
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

  const showOverview = arrangementParam === "overview";
  const showMarketing = arrangementParam === "marketing";
  const showSupport = arrangementParam === "support";

  return (
    <div className="flex-1 bg-mist">
      <DashboardHeader active="client" />

      <div className="mx-auto max-w-screen-2xl px-6 py-10 sm:px-10">
        <Suspense fallback={null}>
          <ArrangementTabs />
        </Suspense>

        <main className="min-w-0">
          {showOverview && (
            <>
              <JumpNav
                items={[
                  { id: "overview-all-sources", label: "All Sources", dot: "bg-charcoal" },
                  { id: "overview-carrier", label: "By Carrier", dot: "bg-charcoal" },
                  { id: "overview-vip", label: "VIP Submissions", dot: "bg-charcoal" },
                ]}
              />
              <SectionBlock id="overview-all-sources" title="All Sources — Overview" accent="border-charcoal">
                {(() => {
                  const connectedSources = sourceSummary.filter((r) => r.connected);
                  const totalOutflow = connectedSources.reduce((sum, r) => sum + r.sent, 0);
                  return (
                    <div className="mb-4 rounded-3xl border-l-4 border-brand-green bg-white p-6 shadow-sm">
                      <Metric label="Total Email Outflow" value={totalOutflow.toLocaleString()} />
                      <p className="mt-2 text-xs text-body-gray">
                        {connectedSources.map((r) => `${r.label.split(" (")[0]}: ${r.sent.toLocaleString()}`).join(" · ")}
                      </p>
                    </div>
                  );
                })()}
                <AllSourcesDigestCard digest={allSourcesDigest} />
                <div className="mb-4 flex justify-end">
                  <Suspense fallback={null}>
                    <RangeSelect />
                  </Suspense>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <DonutChart
                    title="Source Mix (Sent)"
                    segments={sourceSummary
                      .filter((r) => r.connected)
                      .map((r) => ({ label: r.label, value: r.sent }))}
                  />
                  <VolumeTrendChart points={volumeTrend} />
                </div>
                <Collapsible label="full source breakdown table">
                  <SourceSummaryTable rows={sourceSummary} />
                </Collapsible>
              </SectionBlock>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <SectionBlock id="overview-carrier" title="By Carrier" accent="border-charcoal">
                  <Collapsible label="carrier breakdown table">
                    <CarrierSummaryTable rows={carrierSummary} />
                  </Collapsible>
                </SectionBlock>

                <SectionBlock id="overview-vip" title="VIP Form Submissions" accent="border-charcoal">
                  <Collapsible label="VIP submissions table">
                    <VipSubmissionsWidget submissions={vipSubmissions} />
                  </Collapsible>
                </SectionBlock>
              </div>
            </>
          )}

          {showMarketing && (
            <>
              <JumpNav
                items={[
                  { id: "marketing-keap-automations", label: "Keap Automations", dot: "bg-amber-500" },
                  { id: "marketing-keap-broadcasts", label: "Keap Broadcasts", dot: "bg-sky-500" },
                  { id: "marketing-channel-blend", label: "Channel Blend", dot: "bg-violet-500" },
                  { id: "marketing-woodpecker", label: "Woodpecker", dot: "bg-brand-green" },
                ]}
              />
              <GroupDivider label="Automated Performance" />

              <SectionBlock id="marketing-keap-automations" title="Keap Automations" accent="border-amber-500">
                <SectionTabs
                  accent="border-amber-500"
                  tabs={[
                    {
                      label: "Performance",
                      content: (
                        <div>
                          {keapStatusOptions.length > 0 && (
                            <div className="mb-4 flex justify-end">
                              <Suspense fallback={null}>
                                <StatusFilter
                                  paramName="keapStatus"
                                  options={keapStatusOptions}
                                  label="Status"
                                  defaultValue="PUBLISHED"
                                />
                              </Suspense>
                            </div>
                          )}
                          {keapAutomations.length > 0 && (
                            <div className="mb-4">
                              <VerticalBarChart
                                title="Active Contacts by Automation"
                                description="By active contacts currently in the automation. Automations with none active aren't shown."
                                accent="bg-amber-500"
                                rows={keapAutomations
                                  .filter((a) => a.activeContacts > 0)
                                  .sort((a, b) => b.activeContacts - a.activeContacts)
                                  .map((a) => ({ label: a.name, count: a.activeContacts }))}
                              />
                            </div>
                          )}
                          <KeapAutomationsList automations={keapAutomations} />
                          {dormantKeapAutomations.length > 0 && (
                            <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
                              <Collapsible
                                label={`${dormantKeapAutomations.length} dormant automation${
                                  dormantKeapAutomations.length === 1 ? "" : "s"
                                } (0 active contacts the whole time we've tracked)`}
                              >
                                <ul className="flex flex-col gap-1.5 text-sm">
                                  {dormantKeapAutomations.map((a) => (
                                    <li key={a.name} className="flex items-center justify-between gap-3">
                                      <span className="text-charcoal">{a.name}</span>
                                      <span className="whitespace-nowrap text-xs text-body-gray">
                                        0 for {a.daysTracked}d tracked
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </Collapsible>
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      label: "Technical / Events",
                      content: <KeapAutomationEventVolumeTable events={keapAutomationEvents} />,
                    },
                  ]}
                />
              </SectionBlock>

              <GroupDivider label="Manually Logged" />

              <SectionBlock id="marketing-keap-broadcasts" title="Keap Broadcasts" accent="border-sky-500">
                <KeapBroadcastsList broadcasts={keapBroadcasts} />
              </SectionBlock>

              <SectionBlock id="marketing-channel-blend" title="Channel Blend" accent="border-violet-500">
                <ChannelBlendSection
                  summary={channelBlendSummary}
                  automationStats={channelBlendAutomationStats}
                  uploads={channelBlendUploads}
                  patterns={channelBlendPatterns}
                />
              </SectionBlock>

              <GroupDivider label="Automated Performance" />

              <SectionBlock
                id="marketing-woodpecker"
                title={
                  rangeTotals
                    ? `Woodpecker Campaigns (last ${rangeParam} days)`
                    : "Woodpecker Campaigns"
                }
                accent="border-brand-green"
              >
                <SectionTabs
                accent="border-brand-green"
                tabs={[
                  {
                    label: "Overview",
                    content: (
                      <div>
                        <ExecutiveSummaryCard summary={woodpeckerAiSummary} />
                        <SentimentBreakdown sentiment={woodpeckerSentiment} />
                      </div>
                    ),
                  },
                  {
                    label: "Campaigns",
                    content: (
                      <div>
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
                          <Suspense fallback={null}>
                            <RangeSelect />
                          </Suspense>
                        </div>
                        {campaigns.length === 0 ? (
                          <p className="text-body-gray">
                            No campaigns yet — run the import scripts to load
                            Woodpecker data.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-3">
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
                        className="rounded-3xl border-l-4 border-brand-green bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <h3 className="font-heading text-base font-semibold text-charcoal">
                            {c.name}
                          </h3>
                          <StatusPill status={c.status} />
                          <CarrierEditor campaignId={c.id} carrier={c.carrier} />
                        </div>

                        <div className="flex flex-wrap gap-x-8 gap-y-2">
                          <Metric size="sm" label="Sent" value={sent.toLocaleString()} />
                          <div title={OPEN_RATE_CAVEAT}>
                            <Metric size="sm" label="Open rate*" value={openRate} />
                          </div>
                          <Metric
                            size="sm"
                            label="Clicked"
                            value={
                              rangeStats
                                ? "—"
                                : (c.stats?.clicked ?? 0).toLocaleString()
                            }
                          />
                          <Metric
                            size="sm"
                            label="Delivered"
                            value={delivered.toLocaleString()}
                          />
                          <Metric
                            size="sm"
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
                            <Metric size="sm" label="Responded" value="—" />
                          ) : (
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2 text-sm font-bold text-charcoal font-heading">
                                <span className="text-status-positive">
                                  {(c.stats?.interested_yes ?? 0).toLocaleString()}
                                </span>
                                <span className="text-status-warning">
                                  {(c.stats?.interested_maybe ?? 0).toLocaleString()}
                                </span>
                                <span className="text-status-negative">
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
                          <p className="mt-2 text-xs text-body-gray">
                            Last pulled{" "}
                            {new Date(c.stats.pulled_at).toLocaleDateString()}
                          </p>
                        )}

                                  {!rangeStats && <CampaignStepBreakdown steps={c.steps} />}
                                  <CampaignEmailContent emailCopy={c.emailCopy} />
                                  <CampaignProspectsPanel campaignId={c.id} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </SectionBlock>
            </>
          )}

          {showSupport && (
            <>
              <JumpNav
                items={[
                  { id: "support-zendesk", label: "Zendesk", dot: "bg-teal-500" },
                  { id: "support-justcall", label: "JustCall", dot: "bg-sky-500" },
                ]}
              />
              <SectionBlock id="support-zendesk" title="Zendesk" accent="border-teal-500">
                <ZendeskSection
                  summary={zendeskSummary}
                  topicsSummary={zendeskTopicsSummary}
                  groupOptions={zendeskFilterOptions.groups}
                  assigneeOptions={zendeskFilterOptions.assignees}
                />
              </SectionBlock>

              <SectionBlock id="support-justcall" title="JustCall" accent="border-sky-500">
                <JustCallSection summary={justCallSummary} />
              </SectionBlock>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
