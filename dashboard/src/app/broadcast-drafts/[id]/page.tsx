import Link from "next/link";
import { notFound } from "next/navigation";
import { getBroadcastDraft, getBroadcastDraftComments } from "@/lib/data";

export const dynamic = "force-dynamic";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BroadcastDraftDetail } from "@/components/BroadcastDraftDetail";

export default async function BroadcastDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = await getBroadcastDraft(Number(id));
  if (!draft) notFound();

  const comments = await getBroadcastDraftComments(draft.id);

  return (
    <div className="flex-1 bg-mist">
      <DashboardHeader active="client" />
      <div className="mx-auto max-w-screen-2xl px-6 py-10 sm:px-10">
        <Link
          href="/broadcast-drafts"
          className="mb-4 inline-block text-sm font-semibold text-body-gray hover:text-charcoal"
        >
          ← Back to Broadcast Schedule
        </Link>
        <BroadcastDraftDetail draft={draft} comments={comments} />
      </div>
    </div>
  );
}
