import Link from "next/link";
import { Suspense } from "react";
import { getBroadcastDrafts, getLinkedInPosts, type BroadcastDraftStatus } from "@/lib/data";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BroadcastDraftsList } from "@/components/BroadcastDraftsList";
import { BroadcastDraftStatusFilter } from "@/components/BroadcastDraftStatusFilter";
import { LinkedInPostsTable } from "@/components/LinkedInPostsTable";
import { ScheduleChannelFilter } from "@/components/ScheduleChannelFilter";
import { UnifiedScheduleList } from "@/components/UnifiedScheduleList";

export const dynamic = "force-dynamic";

const VALID_STATUSES: BroadcastDraftStatus[] = ["not_started", "writing", "review", "for_approval", "approved", "sent"];

export default async function BroadcastDraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const channel = params.channel === "linkedin" || params.channel === "email" ? params.channel : "all";
  const status = VALID_STATUSES.includes(params.status as BroadcastDraftStatus)
    ? (params.status as BroadcastDraftStatus)
    : undefined;
  // Needed for both the email list (LinkedIn-generated badge) and the
  // LinkedIn list itself, so fetch once regardless of which channel(s) render.
  const linkedInPosts = await getLinkedInPosts();

  return (
    <div className="flex-1 bg-mist">
      <DashboardHeader active="client" />
      <div className="mx-auto max-w-screen-2xl px-6 py-10 sm:px-10">
        <Link href="/" className="mb-4 inline-block text-sm font-semibold text-body-gray hover:text-charcoal">
          ← Back to dashboard
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-bold text-charcoal">Broadcast Schedule</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Suspense fallback={null}>
              <ScheduleChannelFilter />
            </Suspense>
            {channel !== "linkedin" && (
              <Suspense fallback={null}>
                <BroadcastDraftStatusFilter />
              </Suspense>
            )}
          </div>
        </div>

        {channel === "all" ? (
          <UnifiedScheduleList
            // Sent drafts are history, not agenda — the Keap Broadcasts log
            // on the main dashboard is where "already went out" lives.
            drafts={(await getBroadcastDrafts(status)).filter((d) => d.status !== "sent")}
            linkedInPosts={linkedInPosts}
          />
        ) : channel === "linkedin" ? (
          <LinkedInPostsTable posts={linkedInPosts} />
        ) : (
          <BroadcastDraftsList
            // Sent drafts are history, not agenda — the Keap Broadcasts log
            // on the main dashboard is where "already went out" lives. This
            // page defaults to hiding them unless Sent is explicitly picked
            // from the status filter.
            drafts={(await getBroadcastDrafts(status)).filter((d) => status === "sent" || d.status !== "sent")}
            linkedInDraftIds={linkedInPosts.map((p) => p.broadcastDraftId).filter((id): id is number => id != null)}
          />
        )}
      </div>
    </div>
  );
}
