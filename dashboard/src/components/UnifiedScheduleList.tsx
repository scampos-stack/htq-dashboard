import Link from "next/link";
import type { BroadcastDraft, LinkedInPost } from "@/lib/data";
import { BroadcastDraftStatusPill } from "@/components/BroadcastDraftStatusPill";
import { LinkedInPostRow } from "@/components/LinkedInPostsTable";

// Same grouping as BroadcastDraftsList (one card per date+theme, segments as
// sub-rows) — duplicated rather than imported since the "All channels" view
// is read-only (no merge/new-draft controls), so it doesn't need that
// component's stateful merge-mode logic.
function groupDrafts(drafts: BroadcastDraft[]) {
  const groups = new Map<string, { targetDate: string; campaignTheme: string; drafts: BroadcastDraft[] }>();
  for (const d of drafts) {
    const key = `${d.targetDate}|${d.campaignTheme}`;
    const g = groups.get(key) ?? { targetDate: d.targetDate, campaignTheme: d.campaignTheme, drafts: [] };
    g.drafts.push(d);
    groups.set(key, g);
  }
  return [...groups.values()];
}

type ScheduleItem =
  | { kind: "email"; sortKey: string; group: ReturnType<typeof groupDrafts>[number] }
  | { kind: "linkedin"; sortKey: string; post: LinkedInPost };

export function UnifiedScheduleList({
  drafts,
  linkedInPosts,
}: {
  drafts: BroadcastDraft[];
  linkedInPosts: LinkedInPost[];
}) {
  const items: ScheduleItem[] = [
    ...groupDrafts(drafts).map((group) => ({ kind: "email" as const, sortKey: group.targetDate, group })),
    ...linkedInPosts.map((post) => ({
      kind: "linkedin" as const,
      sortKey: post.scheduledDate ?? post.createdAt.slice(0, 10),
      post,
    })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  if (items.length === 0) {
    return <p className="text-body-gray">Nothing scheduled.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) =>
        item.kind === "email" ? (
          <div
            key={`email-${item.group.targetDate}-${item.group.campaignTheme}`}
            className="rounded-3xl border-l-4 border-brand-green bg-white p-5 shadow-sm"
          >
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-semibold text-brand-green-dark">
                  Keap
                </span>
                <h3 className="font-heading text-base font-semibold text-charcoal">{item.group.campaignTheme}</h3>
              </div>
              <span className="text-xs text-body-gray">
                {new Date(item.group.targetDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex flex-col divide-y divide-black/5">
              {item.group.drafts.map((d) => (
                <Link
                  key={d.id}
                  href={`/broadcast-drafts/${d.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-charcoal/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-charcoal">{d.listSegment}</span>
                    {d.audienceEstimate != null && (
                      <span className="text-xs text-body-gray">~{d.audienceEstimate.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {d.assignedTo && (
                      <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                        {d.assignedTo}
                      </span>
                    )}
                    <BroadcastDraftStatusPill status={d.status} />
                    <span className="text-xs font-semibold text-sky-600">View / Edit →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div key={`linkedin-${item.post.id}`} className="rounded-3xl border-l-4 border-sky-500 bg-white shadow-sm">
            <LinkedInPostRow post={item.post} />
          </div>
        )
      )}
    </div>
  );
}
