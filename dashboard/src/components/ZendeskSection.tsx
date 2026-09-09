import { Suspense } from "react";
import type { ZendeskSummary, ZendeskTopicsSummary } from "@/lib/data";
import { HorizontalBarList } from "@/components/HorizontalBarList";
import { DonutChart } from "@/components/DonutChart";
import { ZendeskTopicsCard } from "@/components/ZendeskTopicsCard";
import { ZendeskGroupedStatTable } from "@/components/ZendeskGroupedStatTable";
import { ZendeskRangeSelect } from "@/components/ZendeskRangeSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { SectionTabs } from "@/components/SectionTabs";
import { Metric } from "@/components/Metric";
import { formatDuration } from "@/lib/format-duration";

export function ZendeskSection({
  summary,
  topicsSummary,
  groupOptions,
  assigneeOptions,
}: {
  summary: ZendeskSummary;
  topicsSummary: ZendeskTopicsSummary;
  groupOptions: string[];
  assigneeOptions: string[];
}) {
  const filterBar = (
    <div className="mb-4 flex flex-wrap justify-end gap-3">
      <Suspense fallback={null}>
        <StatusFilter paramName="zendeskGroup" options={groupOptions} label="Group" />
      </Suspense>
      <Suspense fallback={null}>
        <StatusFilter paramName="zendeskAssignee" options={assigneeOptions} label="Assignee" />
      </Suspense>
      <Suspense fallback={null}>
        <ZendeskRangeSelect />
      </Suspense>
    </div>
  );

  if (summary.totalRows === 0) {
    return (
      <div>
        {filterBar}
        <p className="text-body-gray">
          No Zendesk tickets match this range/filter — try widening it, or
          click &quot;Sync Now&quot; if nothing has synced yet.
        </p>
      </div>
    );
  }

  const csatTotal = summary.csat.good + summary.csat.bad;

  const overviewTab = (
    <div>
      <ZendeskTopicsCard summary={topicsSummary} />

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
          <Metric label="Total Tickets" value={summary.totalRows.toLocaleString()} />
        </div>
        <div className="rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
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
        <div className="rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
          <Metric label="Avg First Response" value={formatDuration(summary.avgReplyMinutes)} />
        </div>
        <div className="rounded-3xl border-l-4 border-teal-500 bg-white p-6 shadow-sm">
          <Metric label="Avg Resolution Time" value={formatDuration(summary.avgResolutionMinutes)} />
        </div>
      </div>
    </div>
  );

  const teamTab = (
    <div className="flex flex-col gap-5">
      <ZendeskGroupedStatTable title="Tickets by Agent" columnLabel="Agent" rows={summary.byAgent} />
      <ZendeskGroupedStatTable title="Tickets by Group" columnLabel="Group" rows={summary.byGroup} />
    </div>
  );

  const breakdownTab = (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <DonutChart
        title="Tickets by Status"
        segments={summary.byStatus.map((s) => ({ label: s.status, value: s.count }))}
      />
      {summary.byRequestType.length > 0 && (
        <HorizontalBarList
          title="By Request Type"
          accent="bg-teal-500"
          rows={summary.byRequestType.map((r) => ({ label: r.requestType, count: r.count }))}
        />
      )}
    </div>
  );

  return (
    <div>
      {filterBar}
      <SectionTabs
        accent="border-teal-500"
        tabs={[
          { label: "Overview", content: overviewTab },
          { label: "Agents & Groups", content: teamTab },
          { label: "Status & Tags", content: breakdownTab },
        ]}
      />
    </div>
  );
}
