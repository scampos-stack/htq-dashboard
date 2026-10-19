import Link from "next/link";
import { getLinkedInPosts } from "@/lib/data";
import { DashboardHeader } from "@/components/DashboardHeader";
import { LinkedInPostsTable } from "@/components/LinkedInPostsTable";

export const dynamic = "force-dynamic";

export default async function LinkedInPostsPage() {
  const posts = await getLinkedInPosts();

  return (
    <div className="flex-1 bg-mist">
      <DashboardHeader active="client" />
      <div className="mx-auto max-w-screen-2xl px-6 py-10 sm:px-10">
        <Link href="/" className="mb-4 inline-block text-sm font-semibold text-body-gray hover:text-charcoal">
          ← Back to dashboard
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-bold text-charcoal">LinkedIn Queue</h1>
          <p className="text-xs text-body-gray">
            Review, edit, and track status here — publishing on LinkedIn itself is still manual.
          </p>
        </div>
        <LinkedInPostsTable posts={posts} />
      </div>
    </div>
  );
}
