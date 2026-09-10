import Link from "next/link";
import { getBroadcastDrafts } from "@/lib/data";

export const dynamic = "force-dynamic";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BroadcastDraftsList } from "@/components/BroadcastDraftsList";

export default async function BroadcastDraftsPage() {
  const drafts = await getBroadcastDrafts();

  return (
    <div className="flex-1 bg-mist">
      <DashboardHeader active="client" />
      <div className="mx-auto max-w-screen-2xl px-6 py-10 sm:px-10">
        <Link href="/" className="mb-4 inline-block text-sm font-semibold text-body-gray hover:text-charcoal">
          ← Back to dashboard
        </Link>
        <h1 className="mb-6 font-heading text-2xl font-bold text-charcoal">Broadcast Schedule</h1>
        <BroadcastDraftsList drafts={drafts} />
      </div>
    </div>
  );
}
