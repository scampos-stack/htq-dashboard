import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "./supabase-server";
import { stripHtml } from "./strip-html";
import { slugifyCategory } from "./slugify-category";

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

type ChannelBlendEntry = {
  leadName: string | null;
  state: string | null;
  details: string | null;
};

async function getCategoryDigest(category: string): Promise<ChannelBlendEntry[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("channel_blend_dispositions")
    .select("lead_name, state, details")
    .eq("category", category)
    .not("details", "is", null);
  if (error) throw error;

  return (data ?? []).map((r) => ({
    leadName: r.lead_name,
    state: r.state,
    details: r.details,
  }));
}

async function getPreviousCategorySummary(category: string): Promise<string | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("summary")
    .eq("scope", `channel_blend_patterns:${slugifyCategory(category)}`)
    .maybeSingle();
  if (error) throw error;
  return data?.summary ?? null;
}

// One category at a time so each gets its own card and — since the previous
// summary for that exact category is fed back in — a grounded note on what
// shifted since last time, instead of a single blob covering everything.
async function generateChannelBlendCategoryPatterns(
  category: string
): Promise<{ generated: boolean; reason?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { generated: false, reason: "ANTHROPIC_API_KEY not configured" };
  }

  const digest = await getCategoryDigest(category);
  if (digest.length === 0) {
    return { generated: false, reason: `No "${category}" entries with details yet` };
  }

  const previous = await getPreviousCategorySummary(category);
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    system:
      `You analyze call disposition notes from the "${category}" category ` +
      "of a lead-generation outreach team's Channel Blend spreadsheet. Each " +
      "entry has a free-text \"details\" note describing what happened on " +
      "that call. Ground every pattern strictly in the details text " +
      "provided — never invent reasons or counts not supported by the " +
      "data.\n\n" +
      "Output the top 3 most common recurring patterns, ranked by " +
      "frequency, each as a short one-line bullet: a plain-language label, " +
      "the approximate count of entries matching it, and one representative " +
      "example quoted or closely paraphrased from the details. If fewer " +
      "than 3 genuinely distinct patterns exist, list only as many as are " +
      "real — don't pad to 3. Plain text only, no markdown headers, no " +
      "bold, no nested sub-bullets.\n\n" +
      (previous
        ? "You are also given the PREVIOUS summary generated for this same " +
          "category. After the bullets, add ONE short sentence noting a " +
          "genuine, data-grounded shift from that previous summary (e.g. a " +
          "reason that's now more or less common than before) — only if " +
          "there's a real difference. If the patterns are essentially " +
          "unchanged, say so briefly instead of inventing a shift."
        : "This is the first summary generated for this category — there is " +
          "no previous version, so don't mention a comparison."),
    messages: [
      {
        role: "user",
        content:
          `Here are the "${category}" disposition entries (JSON):\n\n` +
          JSON.stringify(digest, null, 2) +
          (previous ? `\n\nPrevious summary for this category:\n\n${previous}` : ""),
      },
    ],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const summary = textBlock?.text?.trim();
  if (!summary) {
    console.error(
      `[channel-blend patterns:${category}] no text content, stop_reason:`,
      response.stop_reason,
      JSON.stringify(response.content)
    );
    return {
      generated: false,
      reason: `Claude returned no text content for "${category}" (stop_reason: ${response.stop_reason})`,
    };
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("ai_summaries").upsert(
    {
      scope: `channel_blend_patterns:${slugifyCategory(category)}`,
      summary,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "scope" }
  );
  if (error) throw error;

  return { generated: true };
}

// Regenerated after every Channel Blend upload that adds rows — there's no
// scheduled sync for manually-uploaded data, so the upload itself is the
// trigger point (see /api/channel-blend/upload). Fans out one Claude call
// per distinct category rather than one call covering everything.
export async function generateChannelBlendPatternsSummary(): Promise<{
  generated: boolean;
  reason?: string;
  categories?: number;
}> {
  const supabase = supabaseServer();
  const { data: catRows, error: catErr } = await supabase
    .from("channel_blend_dispositions")
    .select("category");
  if (catErr) throw catErr;

  const categories = [...new Set((catRows ?? []).map((r) => r.category))];
  if (categories.length === 0) {
    return { generated: false, reason: "No Channel Blend entries yet" };
  }

  const results = await Promise.all(
    categories.map((c) => generateChannelBlendCategoryPatterns(c))
  );
  const generatedCount = results.filter((r) => r.generated).length;
  if (generatedCount === 0) {
    return { generated: false, reason: results[0]?.reason ?? "No summaries generated" };
  }

  return { generated: true, categories: generatedCount };
}

type ZendeskTicketEntry = {
  subject: string | null;
  description: string | null;
  tags: string[];
};

// Capped to the most recent 500 tickets — plenty for a topic distribution,
// and keeps token usage/cost bounded as ticket volume grows.
async function getZendeskTicketDigest(): Promise<ZendeskTicketEntry[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("zendesk_tickets")
    .select("subject, description, tags")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  return (data ?? []).map((r) => ({
    subject: r.subject,
    description: r.description ? stripHtml(r.description).slice(0, 300) : null,
    tags: r.tags ?? [],
  }));
}

async function getPreviousZendeskTopicsSummary(): Promise<string | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("summary")
    .eq("scope", "zendesk_topics")
    .maybeSingle();
  if (error) throw error;
  return data?.summary ?? null;
}

// Unlike Channel Blend's categories (real spreadsheet tabs), Zendesk
// tickets have no clean category field — the same complaint shows up as
// "not enough leads", "lead quantity", "leads amount", etc. So this asks
// Claude to normalize wording into canonical topics itself, rather than
// just counting raw phrases or tags (the system-generated tags like
// trigger_myfriends/no_survey aren't meaningful topic labels either).
export async function generateZendeskTopicsSummary(): Promise<{
  generated: boolean;
  reason?: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { generated: false, reason: "ANTHROPIC_API_KEY not configured" };
  }

  const digest = await getZendeskTicketDigest();
  if (digest.length === 0) {
    return { generated: false, reason: "No Zendesk tickets synced yet" };
  }

  const previous = await getPreviousZendeskTopicsSummary();
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1536,
    system:
      "You analyze support ticket subjects/descriptions from a " +
      "lead-generation company's Zendesk. Different tickets describe the " +
      "same underlying issue with different wording (e.g. \"not enough " +
      "leads\", \"lead quantity\", \"leads amount\" are all the same " +
      "complaint about lead volume) — your job is to normalize that " +
      "wording into a small set of canonical topic categories, not just " +
      "count raw phrases or repeat the raw tags verbatim. Ground every " +
      "topic strictly in the ticket text provided — never invent a topic " +
      "or count not supported by the data.\n\n" +
      "Output the top 5 recurring topics, ranked by frequency, each as a " +
      "short one-line bullet: a plain-language canonical label for the " +
      "topic, the approximate count of tickets matching it, and one " +
      "representative example subject/phrase from the data. If fewer than " +
      "5 genuinely distinct topics exist, list only as many as are real. " +
      "Plain text only — no markdown headers, no bold, no nested " +
      "sub-bullets.\n\n" +
      (previous
        ? "You are also given the PREVIOUS topics summary. After the " +
          "bullets, add ONE short sentence noting a genuine, data-grounded " +
          "shift since then (a topic becoming more or less common) — only " +
          "if there's a real difference. If topics are essentially " +
          "unchanged, say so briefly instead of inventing a shift."
        : "This is the first summary generated — there's no previous " +
          "version to compare against, so don't mention a comparison."),
    messages: [
      {
        role: "user",
        content:
          "Here are recent Zendesk ticket subjects/descriptions/tags " +
          "(JSON). Identify the top 5 recurring topics, normalizing varied " +
          "wording into the same category where it means the same thing:" +
          "\n\n" + JSON.stringify(digest, null, 2) +
          (previous ? `\n\nPrevious summary:\n\n${previous}` : ""),
      },
    ],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const summary = textBlock?.text?.trim();
  if (!summary) {
    console.error(
      "[zendesk topics] no text content, stop_reason:",
      response.stop_reason,
      JSON.stringify(response.content)
    );
    return {
      generated: false,
      reason: `Claude returned no text content (stop_reason: ${response.stop_reason})`,
    };
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("ai_summaries").upsert(
    {
      scope: "zendesk_topics",
      summary,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "scope" }
  );
  if (error) throw error;

  return { generated: true };
}
