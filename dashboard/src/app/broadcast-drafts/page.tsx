import Link from "next/link";
import { Suspense } from "react";
import { getBroadcastDrafts, type BroadcastDraftStatus } from "@/lib/data";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BroadcastDraftsList } from "@/components/BroadcastDraftsList";
import { BroadcastDraftStatusFilter } from "@/components/BroadcastDraftStatusFilter";

export const dynamic = "force-dynamic";

const VALID_STATUSES: BroadcastDraftStatus[] = ["not_started", "writing", "for_approval", "approved", "sent"];

export default async function BroadcastDraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = VALID_STATUSES.includes(params.status as BroadcastDraftStatus)
    ? (params.status as BroadcastDraftStatus)
    : undefined;
  const drafts = await getBroadcastDrafts(status);

  return (
    <div className="flex-1 bg-mist">
      <DashboardHeader active="client" />
      <div className="mx-auto max-w-screen-2xl px-6 py-10 sm:px-10">
        <Link href="/" className="mb-4 inline-block text-sm font-semibold text-body-gray hover:text-charcoal">
          ← Back to dashboard
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-bold text-charcoal">Broadcast Schedule</h1>
          <Suspense fallback={null}>
            <BroadcastDraftStatusFilter />
          </Suspense>
        </div>
        <BroadcastDraftsList drafts={drafts} />
      </div>
    </div>
  );
}
