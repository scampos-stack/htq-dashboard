import { supabaseServer } from "./supabase-server";

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
    .select("id, category, lead_name, state, details, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const byCategoryMap = new Map<string, number>();
  for (const r of rows) {
    byCategoryMap.set(r.category, (byCategoryMap.get(r.category) ?? 0) + 1);
  }

  return {
    totalRows: rows.length,
    appointmentsBooked: byCategoryMap.get("Appointments") ?? 0,
    byCategory: [...byCategoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
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

export async function getCampaignsWithStats(): Promise<CampaignWithStats[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, source, name, owner, status, carrier")
    .eq("source", "woodpecker")
    .order("name");
  if (campaignsErr) throw campaignsErr;
  if (!campaigns?.length) return [];

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select(
      "campaign_id, sent, delivered, opened, opened_rate, clicked, bounced, bounce_rate, responded, responded_rate, interested_yes, interested_maybe, interested_no, pulled_at"
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
      ...c,
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
    };
  });
}
