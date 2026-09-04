import { supabaseServer } from "./supabase-server";
import { carrierFromEmail } from "./carrier-from-email";
import { slugifyCategory } from "./slugify-category";

export type WoodpeckerAiSummary = {
  summary: string;
  generatedAt: string;
} | null;

export async function getWoodpeckerAiSummary(): Promise<WoodpeckerAiSummary> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("summary, generated_at")
    .eq("scope", "woodpecker")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { summary: data.summary, generatedAt: data.generated_at };
}

export type WoodpeckerSentiment = {
  positive: number;
  neutral: number;
  negative: number;
};

export async function getWoodpeckerSentiment(): Promise<WoodpeckerSentiment> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id")
    .eq("source", "woodpecker");
  if (campaignsErr) throw campaignsErr;
  const campaignIds = new Set((campaigns ?? []).map((c) => c.id));
  if (campaignIds.size === 0) return { positive: 0, neutral: 0, negative: 0 };

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select("campaign_id, interested_yes, interested_maybe, interested_no, pulled_at")
    .order("pulled_at", { ascending: false });
  if (snapshotsErr) throw snapshotsErr;

  const seen = new Set<number>();
  const totals = { positive: 0, neutral: 0, negative: 0 };
  for (const row of snapshots ?? []) {
    if (!campaignIds.has(row.campaign_id) || seen.has(row.campaign_id)) continue;
    seen.add(row.campaign_id);
    totals.positive += row.interested_yes ?? 0;
    totals.neutral += row.interested_maybe ?? 0;
    totals.negative += row.interested_no ?? 0;
  }
  return totals;
}

export type ChannelBlendSummary = {
  totalRows: number;
  appointmentsBooked: number;
  byCategory: { category: string; count: number }[];
  byState: { state: string; count: number }[];
  byCarrier: { carrier: string; count: number }[];
  recent: {
    id: number;
    category: string;
    leadName: string | null;
    state: string | null;
    details: string | null;
    createdAt: string;
  }[];
};

export async function getChannelBlendSummary(): Promise<ChannelBlendSummary> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("channel_blend_dispositions")
    .select("id, category, lead_name, state, details, created_at, email_on_file, preferred_email")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const byCategoryMap = new Map<string, number>();
  const byStateMap = new Map<string, number>();
  const byCarrierMap = new Map<string, number>();
  for (const r of rows) {
    byCategoryMap.set(r.category, (byCategoryMap.get(r.category) ?? 0) + 1);

    if (r.state) {
      const state = r.state.trim().toUpperCase();
      byStateMap.set(state, (byStateMap.get(state) ?? 0) + 1);
    }

    const carrier = carrierFromEmail(r.email_on_file) ?? carrierFromEmail(r.preferred_email);
    if (carrier) byCarrierMap.set(carrier, (byCarrierMap.get(carrier) ?? 0) + 1);
  }

  return {
    totalRows: rows.length,
    appointmentsBooked: byCategoryMap.get("Appointments") ?? 0,
    byCategory: [...byCategoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    byState: [...byStateMap.entries()]
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count),
    byCarrier: [...byCarrierMap.entries()]
      .map(([carrier, count]) => ({ carrier, count }))
      .sort((a, b) => b.count - a.count),
    recent: rows.slice(0, 25).map((r) => ({
      id: r.id,
      category: r.category,
      leadName: r.lead_name,
      state: r.state,
      details: r.details,
      createdAt: r.created_at,
    })),
  };
}

export type ChannelBlendCategoryPattern = {
  category: string;
  summary: string;
  generatedAt: string;
};

export async function getChannelBlendCategoryPatterns(): Promise<ChannelBlendCategoryPattern[]> {
  const supabase = supabaseServer();

  const { data: catRows, error: catErr } = await supabase
    .from("channel_blend_dispositions")
    .select("category");
  if (catErr) throw catErr;

  const categories = [...new Set((catRows ?? []).map((r) => r.category))];
  if (categories.length === 0) return [];

  const scopeByCategory = new Map(categories.map((c) => [`channel_blend_patterns:${slugifyCategory(c)}`, c]));
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("scope, summary, generated_at")
    .in("scope", [...scopeByCategory.keys()]);
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const category = scopeByCategory.get(row.scope);
      if (!category) return null;
      return { category, summary: row.summary, generatedAt: row.generated_at };
    })
    .filter((r): r is ChannelBlendCategoryPattern => r !== null)
    .sort((a, b) => a.category.localeCompare(b.category));
}

export type ChannelBlendUploadRecord = {
  id: number;
  filename: string;
  uploadedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  rowCount: number;
  revertedAt: string | null;
};

export async function getChannelBlendUploads(): Promise<ChannelBlendUploadRecord[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("channel_blend_uploads")
    .select("id, filename, uploaded_at, period_start, period_end, row_count, reverted_at")
    .order("uploaded_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    filename: r.filename,
    uploadedAt: r.uploaded_at,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    rowCount: r.row_count,
    revertedAt: r.reverted_at,
  }));
}

export type KeapAutomationEventVolume = {
  automationName: string;
  eventType: string;
  count: number;
};

export type EventsDateRange = { since: Date; until?: Date };

// Populated by the /api/webhooks/keap endpoint — only for automations that
// have had the HTTP-request step manually added inside Keap. Empty until
// that's wired up per-automation on Keap's side.
export async function getKeapAutomationEventVolume(
  range: EventsDateRange
): Promise<KeapAutomationEventVolume[]> {
  const supabase = supabaseServer();

  let query = supabase
    .from("keap_automation_events")
    .select("event_type, automation_name, occurred_at")
    .gte("occurred_at", range.since.toISOString());
  if (range.until) {
    query = query.lte("occurred_at", range.until.toISOString());
  }
  const { data, error } = await query;
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const name = row.automation_name ?? "(unknown automation)";
    const key = `${name}|${row.event_type}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const [automationName, eventType] = key.split("|");
      return { automationName, eventType, count };
    })
    .sort((a, b) => b.count - a.count);
}

export type ChannelBlendAutomationStats = {
  totalEmailsSent: number;
  recentEvents: { contactEmail: string | null; occurredAt: string }[];
};

// Populated by the "Channel Blend - Email Request" Keap automation's HTTP
// request step (see /api/webhooks/keap) — matched by name, not a fixed
// carrier, so it keeps working if this expands beyond Farmers later.
export async function getChannelBlendAutomationStats(): Promise<ChannelBlendAutomationStats> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("keap_automation_events")
    .select("contact_email, occurred_at, event_type")
    .ilike("automation_name", "%channel blend%")
    .order("occurred_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  return {
    totalEmailsSent: rows.filter((r) => r.event_type === "email_sent").length,
    recentEvents: rows.slice(0, 10).map((r) => ({
      contactEmail: r.contact_email,
      occurredAt: r.occurred_at,
    })),
  };
}

export type KeapBroadcast = {
  id: number;
  campaignName: string;
  dateSent: string;
  emailsDelivered: number;
  opens: number;
  clicks: number;
  replies: number;
  carrier: string;
};

export async function getKeapBroadcasts(): Promise<KeapBroadcast[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("keap_broadcasts")
    .select("id, campaign_name, date_sent, emails_delivered, opens, clicks, replies, carrier")
    .order("date_sent", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    campaignName: r.campaign_name,
    dateSent: r.date_sent,
    emailsDelivered: r.emails_delivered,
    opens: r.opens,
    clicks: r.clicks,
    replies: r.replies,
    carrier: r.carrier ?? "General",
  }));
}

export type VipSubmission = {
  contactId: number;
  name: string;
  email: string | null;
  dateApplied: string;
  formDetails: string;
};

export async function getVipSubmissions(): Promise<VipSubmission[]> {
  const key = process.env.KEAP_API_KEY;
  if (!key) return [];

  const VIP_TAG_ID = 16422;
  const res = await fetch(
    `https://api.infusionsoft.com/crm/rest/v1/tags/${VIP_TAG_ID}/contacts?limit=10&order=date_applied&order_direction=DESCENDING`,
    { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
  );
  if (!res.ok) return [];

  const data = await res.json();
  type VipRow = {
    contact: { id: number; email?: string; first_name?: string; last_name?: string };
    date_applied: string;
  };
  const rows = (data.contacts ?? []) as VipRow[];

  // The tag/contacts list doesn't include phone/company — fetch the full
  // record per contact for "Form Details". Small, fixed-size list (top 10),
  // so the extra calls are cheap.
  const submissions = await Promise.all(
    rows.map(async (row) => {
      let formDetails = "—";
      try {
        const detailRes = await fetch(
          `https://api.infusionsoft.com/crm/rest/v1/contacts/${row.contact.id}`,
          { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const phone = detail.phone_numbers?.[0]?.number;
          const company = detail.company?.company_name;
          formDetails = [phone && `Phone: ${phone}`, company && `Company: ${company}`]
            .filter(Boolean)
            .join(" · ") || "—";
        }
      } catch {
        // leave as "—" — this is a nice-to-have enrichment, not core data
      }

      return {
        contactId: row.contact.id,
        name:
          [row.contact.first_name, row.contact.last_name].filter(Boolean).join(" ") ||
          "(no name)",
        email: row.contact.email ?? null,
        dateApplied: row.date_applied,
        formDetails,
      };
    })
  );

  return submissions;
}

export type CampaignStepStat = {
  step: number;
  version: string | null;
  sent: number;
  delivered: number;
  opened: number;
  responded: number;
  bounced: number;
  interestedYes: number | null;
  interestedMaybe: number | null;
};

export type CampaignWithStats = {
  id: number;
  source: string;
  name: string;
  owner: string | null;
  status: string | null;
  carrier: string | null;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    opened_rate: number | null;
    clicked: number;
    bounced: number;
    bounce_rate: number | null;
    responded: number;
    responded_rate: number | null;
    interested_yes: number | null;
    interested_maybe: number | null;
    interested_no: number | null;
    pulled_at: string;
  } | null;
  steps: CampaignStepStat[];
  emailCopy: { subject: string | null; msg: string | null }[];
};

export type RangeStats = { sent: number; delivered: number; opened: number };

export async function getDailyRangeTotals(
  days: number
): Promise<Map<number, RangeStats>> {
  const supabase = supabaseServer();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("campaign_stats_daily")
    .select("campaign_id, sent, delivered, opened")
    .gte("sent_date", sinceStr);
  if (error) throw error;

  const totals = new Map<number, RangeStats>();
  for (const row of data ?? []) {
    const existing = totals.get(row.campaign_id) ?? {
      sent: 0,
      delivered: 0,
      opened: 0,
    };
    existing.sent += row.sent;
    existing.delivered += row.delivered;
    existing.opened += row.opened;
    totals.set(row.campaign_id, existing);
  }
  return totals;
}

export type DailyVolumePoint = { date: string; sent: number; opened: number };

// Account-wide daily send/open trend across all non-excluded Woodpecker
// campaigns — the first actual chart on any page besides Domain Health.
export async function getDailyVolumeTrend(days: number): Promise<DailyVolumePoint[]> {
  const supabase = supabaseServer();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, exclude_from_metrics")
    .eq("source", "woodpecker");
  if (campaignsErr) throw campaignsErr;
  const eligibleIds = new Set(
    (campaigns ?? []).filter((c) => !c.exclude_from_metrics).map((c) => c.id)
  );

  const { data, error } = await supabase
    .from("campaign_stats_daily")
    .select("campaign_id, sent_date, sent, opened")
    .gte("sent_date", sinceStr);
  if (error) throw error;

  const byDate = new Map<string, { sent: number; opened: number }>();
  for (const row of data ?? []) {
    if (!eligibleIds.has(row.campaign_id)) continue;
    const entry = byDate.get(row.sent_date) ?? { sent: 0, opened: 0 };
    entry.sent += row.sent;
    entry.opened += row.opened;
    byDate.set(row.sent_date, entry);
  }

  return [...byDate.entries()]
    .map(([date, v]) => ({ date, sent: v.sent, opened: v.opened }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type SourceSummaryRow = {
  key: string;
  label: string;
  connected: boolean;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
};

export type CarrierSummaryRow = {
  carrier: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
};

export async function getCarrierSummary(): Promise<CarrierSummaryRow[]> {
  const supabase = supabaseServer();

  const { data: allCampaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, carrier, category, exclude_from_metrics");
  if (campaignsErr) throw campaignsErr;
  // Filtered in JS, not SQL — a `.neq()` on a nullable column silently drops
  // every row where category IS NULL (Woodpecker campaigns never set it).
  const campaigns = (allCampaigns ?? []).filter(
    (c) => c.category !== "email_aggregate" && !c.exclude_from_metrics
  );

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select("campaign_id, sent, delivered, opened, clicked, pulled_at")
    .order("pulled_at", { ascending: false });
  if (snapshotsErr) throw snapshotsErr;

  const latestByCampaign = new Map<number, (typeof snapshots)[number]>();
  for (const row of snapshots ?? []) {
    if (!latestByCampaign.has(row.campaign_id)) {
      latestByCampaign.set(row.campaign_id, row);
    }
  }

  const byCarrier = new Map<string, CarrierSummaryRow>();
  for (const c of campaigns) {
    const carrier = c.carrier ?? "General";
    const row = byCarrier.get(carrier) ?? {
      carrier,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    };
    const s = latestByCampaign.get(c.id);
    row.sent += s?.sent ?? 0;
    row.delivered += s?.delivered ?? 0;
    row.opened += s?.opened ?? 0;
    row.clicked += s?.clicked ?? 0;
    byCarrier.set(carrier, row);
  }

  const { data: broadcasts, error: broadcastsErr } = await supabase
    .from("keap_broadcasts")
    .select("carrier, emails_delivered, opens, clicks");
  if (broadcastsErr) throw broadcastsErr;
  for (const b of broadcasts ?? []) {
    const carrier = b.carrier ?? "General";
    const row = byCarrier.get(carrier) ?? {
      carrier,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    };
    // Broadcasts only capture "delivered," not a separate sent count.
    row.sent += b.emails_delivered;
    row.delivered += b.emails_delivered;
    row.opened += b.opens;
    row.clicked += b.clicks;
    byCarrier.set(carrier, row);
  }

  return [...byCarrier.values()].sort((a, b) => b.sent - a.sent);
}

export async function getSourceSummary(): Promise<SourceSummaryRow[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, source, category, exclude_from_metrics");
  if (campaignsErr) throw campaignsErr;

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select("campaign_id, sent, delivered, opened, clicked, pulled_at")
    .order("pulled_at", { ascending: false });
  if (snapshotsErr) throw snapshotsErr;

  const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const latestByCampaign = new Map<number, (typeof snapshots)[number]>();
  for (const row of snapshots ?? []) {
    if (!latestByCampaign.has(row.campaign_id)) {
      latestByCampaign.set(row.campaign_id, row);
    }
  }

  const woodpecker: SourceSummaryRow = {
    key: "woodpecker",
    label: "Woodpecker (cold email)",
    connected: true,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
  };
  const keapAutomationEmails: SourceSummaryRow = {
    key: "keap_automation_emails",
    label: "Keap Automations (webhook-tracked, sent only)",
    connected: false,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
  };
  let keapEmailsSnapshot: (typeof snapshots)[number] | undefined;

  for (const [campaignId, s] of latestByCampaign) {
    const campaign = campaignById.get(campaignId);
    if (!campaign || campaign.exclude_from_metrics) continue;

    if (campaign.source === "woodpecker") {
      woodpecker.sent += s.sent;
      woodpecker.delivered += s.delivered;
      woodpecker.opened += s.opened;
      woodpecker.clicked += s.clicked;
    } else if (campaign.source === "keap" && campaign.category === "email_aggregate") {
      keapEmailsSnapshot = s;
    } else if (campaign.source === "keap") {
      keapAutomationEmails.sent += s.sent;
      keapAutomationEmails.connected = keapAutomationEmails.connected || s.sent > 0;
    }
  }

  const keapEmails: SourceSummaryRow = {
    key: "keap_emails",
    label: "Keap Marketing Emails (all types, account-wide)",
    connected: !!keapEmailsSnapshot,
    sent: keapEmailsSnapshot?.sent ?? 0,
    delivered: keapEmailsSnapshot?.delivered ?? 0,
    opened: keapEmailsSnapshot?.opened ?? 0,
    clicked: keapEmailsSnapshot?.clicked ?? 0,
  };

  const { data: broadcasts, error: broadcastsErr } = await supabase
    .from("keap_broadcasts")
    .select("emails_delivered, opens, clicks");
  if (broadcastsErr) throw broadcastsErr;
  const keapBroadcasts: SourceSummaryRow = {
    key: "keap_broadcasts",
    label: "Keap Broadcasts (manual entry)",
    connected: (broadcasts ?? []).length > 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
  };
  for (const b of broadcasts ?? []) {
    keapBroadcasts.sent += b.emails_delivered;
    keapBroadcasts.delivered += b.emails_delivered;
    keapBroadcasts.opened += b.opens;
    keapBroadcasts.clicked += b.clicks;
  }

  return [woodpecker, keapEmails, keapAutomationEmails, keapBroadcasts];
}

export type KeapAutomationSummaryRow = {
  category: string;
  label: string;
  automationCount: number;
  activeContacts: number;
  completedContacts: number;
};

export async function getKeapAutomationsSummary(): Promise<
  KeapAutomationSummaryRow[]
> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, category")
    .eq("source", "keap");
  if (campaignsErr) throw campaignsErr;
  if (!campaigns?.length) return [];

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select("campaign_id, active_contacts, completed_contacts, pulled_at")
    .order("pulled_at", { ascending: false });
  if (snapshotsErr) throw snapshotsErr;

  const latestByCampaign = new Map<number, (typeof snapshots)[number]>();
  for (const row of snapshots ?? []) {
    if (!latestByCampaign.has(row.campaign_id)) {
      latestByCampaign.set(row.campaign_id, row);
    }
  }

  const labels: Record<string, string> = {
    automation_lead_marketing: "Lead Marketing",
    automation_customer_comms: "Customer / Comms",
  };

  const byCategory = new Map<string, KeapAutomationSummaryRow>();
  for (const c of campaigns) {
    const category = c.category ?? "uncategorized";
    const row =
      byCategory.get(category) ??
      ({
        category,
        label: labels[category] ?? category,
        automationCount: 0,
        activeContacts: 0,
        completedContacts: 0,
      } satisfies KeapAutomationSummaryRow);

    const s = latestByCampaign.get(c.id);
    row.automationCount += 1;
    row.activeContacts += s?.active_contacts ?? 0;
    row.completedContacts += s?.completed_contacts ?? 0;
    byCategory.set(category, row);
  }

  return [...byCategory.values()];
}

export type KeapAutomation = {
  id: number;
  name: string;
  status: string | null;
  category: string;
  carrier: string | null;
  excludeFromMetrics: boolean;
  activeContacts: number;
  completedContacts: number;
};

export async function getKeapAutomations(): Promise<KeapAutomation[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, name, status, category, carrier, exclude_from_metrics")
    .eq("source", "keap")
    .neq("category", "email_aggregate")
    .order("name");
  if (campaignsErr) throw campaignsErr;
  if (!campaigns?.length) return [];

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select("campaign_id, active_contacts, completed_contacts, pulled_at")
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
      id: c.id,
      name: c.name,
      status: c.status,
      category: c.category ?? "uncategorized",
      carrier: c.carrier,
      excludeFromMetrics: c.exclude_from_metrics ?? false,
      activeContacts: s?.active_contacts ?? 0,
      completedContacts: s?.completed_contacts ?? 0,
    };
  });
}

export type DormantKeapAutomation = {
  name: string;
  daysTracked: number;
};

// An automation with 0 active contacts on every day we've snapshotted (not
// just currently 0) — surfaced separately from the main list so a
// long-dead automation doesn't sit mixed in with ones that just emptied
// out this week and may refill. Requires a minimum tracked-days count so a
// brand-new automation with only a day or two of history isn't mistaken
// for dormant.
const DORMANT_MIN_TRACKED_DAYS = 7;

export async function getDormantKeapAutomations(): Promise<DormantKeapAutomation[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("source", "keap")
    .neq("category", "email_aggregate");
  if (campaignsErr) throw campaignsErr;
  if (!campaigns?.length) return [];

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select("campaign_id, active_contacts, pulled_at")
    .in(
      "campaign_id",
      campaigns.map((c) => c.id)
    );
  if (snapshotsErr) throw snapshotsErr;

  // A fast-cycling automation (contacts enter and complete before the next
  // daily snapshot) can show 0 active contacts every single day while
  // still being genuinely alive — the webhook-tracked sent events are the
  // only signal that catches that, since they log the moment an email
  // actually goes out rather than a once-a-day active-contact count.
  // Cross-referencing against them keeps a fast automation like that off
  // this list. Same contains-match the webhook route itself uses to tie an
  // event's automation_name back to a real campaign.
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data: recentEvents, error: eventsErr } = await supabase
    .from("keap_automation_events")
    .select("automation_name, event_type")
    .gte("occurred_at", since.toISOString())
    .ilike("event_type", "%sent%");
  if (eventsErr) throw eventsErr;

  const recentlyActiveCampaignIds = new Set<number>();
  for (const event of recentEvents ?? []) {
    if (!event.automation_name) continue;
    for (const c of campaigns) {
      if (c.name.toLowerCase().includes(event.automation_name.toLowerCase())) {
        recentlyActiveCampaignIds.add(c.id);
      }
    }
  }

  const byCampaign = new Map<number, { days: Set<string>; everActive: boolean }>();
  for (const row of snapshots ?? []) {
    const entry = byCampaign.get(row.campaign_id) ?? { days: new Set<string>(), everActive: false };
    entry.days.add(row.pulled_at);
    if ((row.active_contacts ?? 0) > 0) entry.everActive = true;
    byCampaign.set(row.campaign_id, entry);
  }

  const nameById = new Map(campaigns.map((c) => [c.id, c.name]));
  const dormant: DormantKeapAutomation[] = [];
  for (const [campaignId, entry] of byCampaign) {
    if (entry.everActive) continue;
    if (recentlyActiveCampaignIds.has(campaignId)) continue;
    if (entry.days.size < DORMANT_MIN_TRACKED_DAYS) continue;
    dormant.push({ name: nameById.get(campaignId) ?? "Unknown", daysTracked: entry.days.size });
  }

  return dormant.sort((a, b) => b.daysTracked - a.daysTracked);
}

export async function getCampaignsWithStats(): Promise<CampaignWithStats[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, source, name, owner, status, carrier, email_copy")
    .eq("source", "woodpecker")
    .order("name");
  if (campaignsErr) throw campaignsErr;
  if (!campaigns?.length) return [];

  // step is null for the whole-campaign aggregate snapshot — excluded here
  // so a per-step row (added by the step-stats sync) can't get picked up as
  // "the" stats for a campaign card just because it happens to sort first.
  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select(
      "campaign_id, sent, delivered, opened, opened_rate, clicked, bounced, bounce_rate, responded, responded_rate, interested_yes, interested_maybe, interested_no, pulled_at"
    )
    .is("step", null)
    .order("pulled_at", { ascending: false });
  if (snapshotsErr) throw snapshotsErr;

  const latestByCampaign = new Map<number, (typeof snapshots)[number]>();
  for (const row of snapshots ?? []) {
    if (!latestByCampaign.has(row.campaign_id)) {
      latestByCampaign.set(row.campaign_id, row);
    }
  }

  const { data: stepSnapshots, error: stepSnapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select(
      "campaign_id, step, version, sent, delivered, opened, responded, bounced, interested_yes, interested_maybe, pulled_at"
    )
    .not("step", "is", null)
    .order("pulled_at", { ascending: false });
  if (stepSnapshotsErr) throw stepSnapshotsErr;

  const latestStepByKey = new Map<string, (typeof stepSnapshots)[number]>();
  for (const row of stepSnapshots ?? []) {
    const key = `${row.campaign_id}|${row.step}|${row.version ?? ""}`;
    if (!latestStepByKey.has(key)) latestStepByKey.set(key, row);
  }

  const stepsByCampaign = new Map<number, CampaignStepStat[]>();
  for (const row of latestStepByKey.values()) {
    const list = stepsByCampaign.get(row.campaign_id) ?? [];
    list.push({
      step: row.step as number,
      version: row.version,
      sent: row.sent,
      delivered: row.delivered,
      opened: row.opened,
      responded: row.responded,
      bounced: row.bounced,
      interestedYes: row.interested_yes,
      interestedMaybe: row.interested_maybe,
    });
    stepsByCampaign.set(row.campaign_id, list);
  }
  for (const list of stepsByCampaign.values()) {
    list.sort((a, b) => a.step - b.step || (a.version ?? "").localeCompare(b.version ?? ""));
  }

  return campaigns.map((c) => {
    const s = latestByCampaign.get(c.id);
    const { email_copy, ...rest } = c;
    return {
      ...rest,
      stats: s
        ? {
            sent: s.sent,
            delivered: s.delivered,
            opened: s.opened,
            opened_rate: s.opened_rate,
            clicked: s.clicked,
            bounced: s.bounced,
            bounce_rate: s.bounce_rate,
            responded: s.responded,
            responded_rate: s.responded_rate,
            interested_yes: s.interested_yes,
            interested_maybe: s.interested_maybe,
            interested_no: s.interested_no,
            pulled_at: s.pulled_at,
          }
        : null,
      steps: stepsByCampaign.get(c.id) ?? [],
      emailCopy: (email_copy ?? []) as { subject: string | null; msg: string | null }[],
    };
  });
}

export type ZendeskGroupedStat = {
  label: string;
  count: number;
  avgReplyMinutes: number | null;
  avgResolutionMinutes: number | null;
};

export type ZendeskSummary = {
  totalRows: number;
  byStatus: { status: string; count: number }[];
  topTags: { tag: string; count: number }[];
  csat: { good: number; bad: number };
  avgReplyMinutes: number | null;
  avgResolutionMinutes: number | null;
  byAgent: ZendeskGroupedStat[];
  byGroup: ZendeskGroupedStat[];
  recent: {
    id: number;
    subject: string | null;
    status: string | null;
    priority: string | null;
    requesterEmail: string | null;
    createdAt: string | null;
  }[];
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export type ZendeskDateRange = { since: Date; until?: Date };

// Distinct group/assignee names for the filter dropdowns — deliberately
// unscoped by range or by the other filter's current selection, so
// switching groups doesn't collapse the assignee dropdown's own options.
export async function getZendeskFilterOptions(): Promise<{ groups: string[]; assignees: string[] }> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("zendesk_tickets").select("group_name, assignee_name");
  if (error) throw error;

  const groups = new Set<string>();
  const assignees = new Set<string>();
  for (const r of data ?? []) {
    groups.add(r.group_name || "Ungrouped");
    assignees.add(r.assignee_name || "Unassigned");
  }
  return {
    groups: [...groups].sort(),
    assignees: [...assignees].sort(),
  };
}

export async function getZendeskSummary(
  range?: ZendeskDateRange,
  groupName?: string,
  assigneeName?: string
): Promise<ZendeskSummary> {
  const supabase = supabaseServer();

  let query = supabase
    .from("zendesk_tickets")
    .select(
      "id, subject, status, priority, tags, requester_email, assignee_email, assignee_name, group_name, satisfaction_score, reply_time_minutes, full_resolution_time_minutes, created_at"
    )
    .order("created_at", { ascending: false });
  if (range) {
    query = query.gte("created_at", range.since.toISOString());
    if (range.until) query = query.lte("created_at", range.until.toISOString());
  }
  // "Ungrouped"/"Unassigned" are the byGroup/byAgent fallback labels for a
  // null column — matched with .is(), not .eq(), since a real group/agent
  // name never equals null.
  if (groupName) {
    query = groupName === "Ungrouped" ? query.is("group_name", null) : query.eq("group_name", groupName);
  }
  if (assigneeName) {
    query =
      assigneeName === "Unassigned"
        ? query.is("assignee_name", null)
        : query.eq("assignee_name", assigneeName);
  }
  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const byStatusMap = new Map<string, number>();
  const tagMap = new Map<string, number>();
  const csat = { good: 0, bad: 0 };
  const replyTimes: number[] = [];
  const resolutionTimes: number[] = [];
  const agentMap = new Map<
    string,
    { count: number; replyTimes: number[]; resolutionTimes: number[] }
  >();
  const groupMap = new Map<
    string,
    { count: number; replyTimes: number[]; resolutionTimes: number[] }
  >();

  for (const r of rows) {
    const status = r.status ?? "unknown";
    byStatusMap.set(status, (byStatusMap.get(status) ?? 0) + 1);

    for (const tag of r.tags ?? []) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }

    if (r.satisfaction_score === "good") csat.good += 1;
    else if (r.satisfaction_score === "bad") csat.bad += 1;

    if (r.reply_time_minutes != null) replyTimes.push(r.reply_time_minutes);
    if (r.full_resolution_time_minutes != null) resolutionTimes.push(r.full_resolution_time_minutes);

    const agent = r.assignee_name || r.assignee_email || "Unassigned";
    const agentEntry = agentMap.get(agent) ?? { count: 0, replyTimes: [], resolutionTimes: [] };
    agentEntry.count += 1;
    if (r.reply_time_minutes != null) agentEntry.replyTimes.push(r.reply_time_minutes);
    if (r.full_resolution_time_minutes != null) agentEntry.resolutionTimes.push(r.full_resolution_time_minutes);
    agentMap.set(agent, agentEntry);

    const group = r.group_name || "Ungrouped";
    const groupEntry = groupMap.get(group) ?? { count: 0, replyTimes: [], resolutionTimes: [] };
    groupEntry.count += 1;
    if (r.reply_time_minutes != null) groupEntry.replyTimes.push(r.reply_time_minutes);
    if (r.full_resolution_time_minutes != null) groupEntry.resolutionTimes.push(r.full_resolution_time_minutes);
    groupMap.set(group, groupEntry);
  }

  return {
    totalRows: rows.length,
    byStatus: [...byStatusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    topTags: [...tagMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    csat,
    avgReplyMinutes: average(replyTimes),
    avgResolutionMinutes: average(resolutionTimes),
    byAgent: [...agentMap.entries()]
      .map(([agent, e]) => ({
        label: agent,
        count: e.count,
        avgReplyMinutes: average(e.replyTimes),
        avgResolutionMinutes: average(e.resolutionTimes),
      }))
      .sort((a, b) => b.count - a.count),
    byGroup: [...groupMap.entries()]
      .map(([group, e]) => ({
        label: group,
        count: e.count,
        avgReplyMinutes: average(e.replyTimes),
        avgResolutionMinutes: average(e.resolutionTimes),
      }))
      .sort((a, b) => b.count - a.count),
    recent: rows.slice(0, 25).map((r) => ({
      id: r.id,
      subject: r.subject,
      status: r.status,
      priority: r.priority,
      requesterEmail: r.requester_email,
      createdAt: r.created_at,
    })),
  };
}

export type JustCallSummary = {
  totalCalls: number;
  byDirection: { direction: string; count: number }[];
  byType: { type: string; count: number }[];
  byAgent: { label: string; count: number; avgDurationSeconds: number | null }[];
  topDispositions: { disposition: string; count: number }[];
  recent: {
    id: number;
    contactNumber: string | null;
    contactName: string | null;
    agentName: string | null;
    direction: string | null;
    type: string | null;
    disposition: string | null;
    durationSeconds: number | null;
    recordingUrl: string | null;
    callAt: string;
  }[];
};

const EMPTY_JUSTCALL_SUMMARY: JustCallSummary = {
  totalCalls: 0,
  byDirection: [],
  byType: [],
  byAgent: [],
  topDispositions: [],
  recent: [],
};

export async function getJustCallSummary(range?: ZendeskDateRange): Promise<JustCallSummary> {
  const supabase = supabaseServer();

  let query = supabase
    .from("justcall_calls")
    .select(
      "id, contact_number, contact_name, agent_name, direction, call_type, disposition, duration_seconds, recording_url, call_at"
    )
    .order("call_at", { ascending: false });
  if (range) {
    query = query.gte("call_at", range.since.toISOString());
    if (range.until) query = query.lte("call_at", range.until.toISOString());
  }
  const { data, error } = await query;
  // The migration adding justcall_calls may not have been run yet — this
  // feeds the same Promise.all as the rest of the page, so a missing table
  // here would otherwise take down the entire dashboard rather than just
  // this one section.
  if (error) {
    console.error("[getJustCallSummary] query failed (has migration 017 been run?):", error);
    return EMPTY_JUSTCALL_SUMMARY;
  }

  const rows = data ?? [];
  const directionMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  const dispositionMap = new Map<string, number>();
  const agentMap = new Map<string, { count: number; durations: number[] }>();

  for (const r of rows) {
    const direction = r.direction || "Unknown";
    directionMap.set(direction, (directionMap.get(direction) ?? 0) + 1);

    const type = r.call_type || "unknown";
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1);

    if (r.disposition) {
      dispositionMap.set(r.disposition, (dispositionMap.get(r.disposition) ?? 0) + 1);
    }

    const agent = r.agent_name || "Unassigned";
    const agentEntry = agentMap.get(agent) ?? { count: 0, durations: [] };
    agentEntry.count += 1;
    if (r.duration_seconds != null) agentEntry.durations.push(r.duration_seconds);
    agentMap.set(agent, agentEntry);
  }

  return {
    totalCalls: rows.length,
    byDirection: [...directionMap.entries()]
      .map(([direction, count]) => ({ direction, count }))
      .sort((a, b) => b.count - a.count),
    byType: [...typeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    byAgent: [...agentMap.entries()]
      .map(([agent, e]) => ({
        label: agent,
        count: e.count,
        avgDurationSeconds: average(e.durations),
      }))
      .sort((a, b) => b.count - a.count),
    topDispositions: [...dispositionMap.entries()]
      .map(([disposition, count]) => ({ disposition, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    recent: rows.slice(0, 25).map((r) => ({
      id: r.id,
      contactNumber: r.contact_number,
      contactName: r.contact_name,
      agentName: r.agent_name,
      direction: r.direction,
      type: r.call_type,
      disposition: r.disposition,
      durationSeconds: r.duration_seconds,
      recordingUrl: r.recording_url,
      callAt: r.call_at,
    })),
  };
}

export type ZendeskTopicsSummary = {
  summary: string;
  generatedAt: string;
} | null;

export async function getZendeskTopicsSummary(): Promise<ZendeskTopicsSummary> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("summary, generated_at")
    .eq("scope", "zendesk_topics")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { summary: data.summary, generatedAt: data.generated_at };
}

export type AllSourcesDigest = {
  summary: string;
  generatedAt: string;
} | null;

export async function getAllSourcesDigest(): Promise<AllSourcesDigest> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("summary, generated_at")
    .eq("scope", "all_sources_digest")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { summary: data.summary, generatedAt: data.generated_at };
}
