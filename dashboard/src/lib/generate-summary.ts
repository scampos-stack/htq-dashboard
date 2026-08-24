import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "./supabase-server";

type CampaignDigest = {
  name: string;
  status: string | null;
  sent: number;
  delivered: number;
  opened: number;
  openedRate: number | null;
  clicked: number;
  bounced: number;
  bounceRate: number | null;
  responded: number;
  interestedYes: number | null;
  interestedMaybe: number | null;
  interestedNo: number | null;
};

async function getWoodpeckerDigest(): Promise<CampaignDigest[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, name, status")
    .eq("source", "woodpecker");
  if (campaignsErr) throw campaignsErr;
  if (!campaigns?.length) return [];

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select(
      "campaign_id, sent, delivered, opened, opened_rate, clicked, bounced, bounce_rate, responded, interested_yes, interested_maybe, interested_no, pulled_at"
    )
    .order("pulled_at", { ascending: false });
  if (snapshotsErr) throw snapshotsErr;

  const latestByCampaign = new Map<number, (typeof snapshots)[number]>();
  for (const row of snapshots ?? []) {
    if (!latestByCampaign.has(row.campaign_id)) {
      latestByCampaign.set(row.campaign_id, row);
    }
  }

  return campaigns.map((c) => {
    const s = latestByCampaign.get(c.id);
    return {
      name: c.name,
      status: c.status,
      sent: s?.sent ?? 0,
      delivered: s?.delivered ?? 0,
      opened: s?.opened ?? 0,
      openedRate: s?.opened_rate ?? null,
      clicked: s?.clicked ?? 0,
      bounced: s?.bounced ?? 0,
      bounceRate: s?.bounce_rate ?? null,
      responded: s?.responded ?? 0,
      interestedYes: s?.interested_yes ?? null,
      interestedMaybe: s?.interested_maybe ?? null,
      interestedNo: s?.interested_no ?? null,
    };
  });
}

export async function generateWoodpeckerExecutiveSummary(): Promise<{
  generated: boolean;
  reason?: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { generated: false, reason: "ANTHROPIC_API_KEY not configured" };
  }

  const digest = await getWoodpeckerDigest();
  if (digest.length === 0) {
    return { generated: false, reason: "No Woodpecker campaign data yet" };
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    system:
      "You write short executive summaries for a marketing dashboard. " +
      "Ground every statement strictly in the numbers provided — never speculate, " +
      "estimate, or invent figures not present in the data. If the data is too thin " +
      "for a meaningful summary, say so plainly. Plain language, 3-5 sentences, " +
      "no headers or bullet points, suitable for a busy executive skimming a dashboard.",
    messages: [
      {
        role: "user",
        content:
          "Here is the current Woodpecker campaign data (JSON). Write the executive summary:\n\n" +
          JSON.stringify(digest, null, 2),
      },
    ],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const summary = textBlock?.text?.trim();
  if (!summary) {
    return { generated: false, reason: "Claude returned no text content" };
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("ai_summaries").upsert(
    {
      scope: "woodpecker",
      summary,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "scope" }
  );
  if (error) throw error;

  return { generated: true };
}
