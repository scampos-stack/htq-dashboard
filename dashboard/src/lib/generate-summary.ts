import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "./supabase-server";
import { stripHtml } from "./strip-html";

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
  emailCopy: { subject: string | null; msg: string | null }[] | null;
};

async function getWoodpeckerDigest(): Promise<CampaignDigest[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, name, status, email_copy")
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
    const rawCopy = (c.email_copy ?? []) as { subject: string | null; msg: string | null }[];
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
      emailCopy: rawCopy.length
        ? rawCopy.map((e) => ({
            subject: e.subject,
            msg: e.msg ? stripHtml(e.msg).slice(0, 800) : null,
          }))
        : null,
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
      "You are an expert email marketing analyst. Analyze the provided " +
      "campaign performance data and write an Executive Summary (150-250 " +
      "words) adhering strictly to these rules.\n\n" +
      "Ground every statement strictly in the numbers and email copy " +
      "provided — never speculate, estimate, or invent figures or claims " +
      "not present in the data. If the data is too thin for a meaningful " +
      "summary, say so plainly rather than guessing.\n\n" +
      "Structure & Content Requirements (plain language, two paragraphs, " +
      "no headers or markdown):\n\n" +
      "Paragraph 1: Performance Snapshot\n" +
      "- State top performer(s) by open rate and delivery metrics.\n" +
      "- State clear underperformer(s) and highlight sharp metric " +
      "deviations (e.g. 87%+ vs <1% open rates).\n" +
      "- Note reply sentiment split (Interested/Maybe/Uninterested) and " +
      "flag overall engagement gaps (e.g. zero-click metrics across all " +
      "campaigns).\n\n" +
      "Paragraph 2: Copy & Technical Audits (Actionable Fixes)\n" +
      "- Identify specific typos, incorrect brand naming, or grammar " +
      "issues in subject lines (e.g. pluralization errors).\n" +
      "- Identify merge field formatting bugs in email bodies (e.g. " +
      "missing spaces/commas after personalization tags).\n" +
      "- Recommend CTA consolidation if body copy presents multiple " +
      "competing calls-to-action (e.g. booking a call vs. texting vs. " +
      "filling out a form).\n" +
      "- Provide context on whether failure is likely copy-driven or " +
      "requires further technical/deliverability investigation.\n\n" +
      "Base paragraph 2 only on campaigns where email_copy is present in " +
      "the data — if no campaign has email_copy, say a copy audit isn't " +
      "possible without it rather than inventing subject lines or body " +
      "text.",
    messages: [
      {
        role: "user",
        content:
          "Here is the current Woodpecker campaign data, including email copy " +
          "where available (JSON). Write the executive summary:\n\n" +
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

type FeedbackEntry = {
  leadName: string | null;
  state: string | null;
  details: string | null;
};

async function getChannelBlendFeedbackDigest(): Promise<FeedbackEntry[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("channel_blend_dispositions")
    .select("lead_name, state, details")
    .ilike("category", "feedback")
    .not("details", "is", null);
  if (error) throw error;

  return (data ?? []).map((r) => ({
    leadName: r.lead_name,
    state: r.state,
    details: r.details,
  }));
}

// Regenerated after each Channel Blend upload that touches the "Feedback"
// category — there's no scheduled sync for manually-uploaded data, so the
// upload itself is the trigger point (see /api/channel-blend/upload).
export async function generateChannelBlendFeedbackSummary(): Promise<{
  generated: boolean;
  reason?: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { generated: false, reason: "ANTHROPIC_API_KEY not configured" };
  }

  const digest = await getChannelBlendFeedbackDigest();
  if (digest.length === 0) {
    return { generated: false, reason: "No Feedback entries yet" };
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    system:
      "You analyze call disposition notes from a lead-generation outreach " +
      "team's \"Feedback\" category and surface the most common reasons " +
      "contacts gave. Ground every theme strictly in the details text " +
      "provided — never invent reasons or counts not supported by the data." +
      "\n\nOutput a numbered list of the top 5 recurring themes, ranked by " +
      "frequency, plain language, no markdown headers or bold. For each: a " +
      "short theme title, the count of entries matching it, and one " +
      "representative example quoted or closely paraphrased from the " +
      "details. If fewer than 5 distinct themes exist, list only as many as " +
      "are genuinely distinct.",
    messages: [
      {
        role: "user",
        content:
          "Here are the Feedback disposition entries (JSON). Identify the " +
          "top 5 recurring feedback themes:\n\n" + JSON.stringify(digest, null, 2),
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
      scope: "channel_blend_feedback",
      summary,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "scope" }
  );
  if (error) throw error;

  return { generated: true };
}
