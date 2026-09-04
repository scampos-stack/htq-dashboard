import { NextResponse } from "next/server";
import { syncKeap } from "@/lib/sync-keap";
import { syncWoodpecker } from "@/lib/sync-woodpecker";
import { syncZendesk } from "@/lib/sync-zendesk";
import { syncJustCall } from "@/lib/sync-justcall";
import { generateWoodpeckerExecutiveSummary, generateZendeskTopicsSummary } from "@/lib/generate-summary";
import { errorMessage } from "@/lib/error-message";

// Daily automated sync — Keap, Woodpecker, and Zendesk share this one cron
// job (Keap's email aggregate gets its own, in sync-keap-emails, since it
// needs a much longer maxDuration and the Hobby plan's cron-job cap made
// bundling everything into a single job not an option). Each source is
// isolated with allSettled so one failing doesn't block the others, same
// as SyncButton's client-side behavior for a manual sync.
export const maxDuration = 120;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [keap, woodpecker, zendesk, justcall] = await Promise.allSettled([
    syncKeap(),
    syncWoodpecker().then(async (result) => {
      const aiSummary = await generateWoodpeckerExecutiveSummary().catch((err) => {
        console.error("[cron] woodpecker ai summary failed:", err);
        return { generated: false, reason: errorMessage(err) };
      });
      return { ...result, aiSummary };
    }),
    syncZendesk().then(async (result) => {
      if (result.tickets > 0) {
        await generateZendeskTopicsSummary().catch((err) => {
          console.error("[cron] zendesk topics summary failed:", err);
        });
      }
      return result;
    }),
    syncJustCall(),
  ]);

  const summarize = (label: string, r: PromiseSettledResult<Record<string, unknown>>) =>
    r.status === "fulfilled"
      ? { source: label, ok: true, ...r.value }
      : { source: label, ok: false, error: errorMessage(r.reason) };

  const results = [
    summarize("keap", keap),
    summarize("woodpecker", woodpecker),
    summarize("zendesk", zendesk),
    summarize("justcall", justcall),
  ];
  for (const r of results) {
    if (!r.ok) console.error(`[cron] ${r.source} failed:`, r.error);
  }

  return NextResponse.json({ ok: true, results });
}
