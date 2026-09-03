import { supabaseServer } from "./supabase-server";
import { classifyCarrier } from "./classify-carrier";
import { errorMessage } from "./error-message";
import { upsertDailySnapshot } from "./upsert-daily-snapshot";

const API_BASE = "https://api.woodpecker.co/rest/v1";

async function wpFetch(path: string) {
  const key = process.env.WOODPECKER_API_KEY;
  if (!key) throw new Error("Missing WOODPECKER_API_KEY env var");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-api-key": key },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Woodpecker API ${path} -> ${res.status} ${res.statusText}${body ? `: ${body}` : ""}`);
  }
  return res.json();
}

async function wpFetchV2(path: string, init?: RequestInit) {
  const key = process.env.WOODPECKER_API_KEY;
  if (!key) throw new Error("Missing WOODPECKER_API_KEY env var");

  const res = await fetch(`https://api.woodpecker.co/rest/v2${path}`, {
    ...init,
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Woodpecker API v2 ${path} -> ${res.status} ${res.statusText}${body ? `: ${body}` : ""}`);
  }
  return res.json();
}

type WoodpeckerReportRow = {
  id: number;
  step: number;
  version: string | null;
  sent?: number;
  bounced?: number;
  bounce_rate?: number;
  opened?: number;
  opened_rate?: number;
  clicked?: number;
  opt_out?: number;
  opt_out_rate?: number;
  delivered?: number;
  responded?: number;
  responded_rate?: number;
  interested_yes?: number;
  interested_maybe?: number;
  interested_no?: number;
};

// Per-step numbers (sent/delivered/opened/etc broken down by each email in a
// campaign's sequence) aren't in the plain campaign_list response — they
// only come from this predefined report, which is generated async: kick it
// off, then poll the hash until it's READY.
// https://developers.woodpecker.co/docs/reports/Complete-statistics
async function fetchStepStatsReport(): Promise<WoodpeckerReportRow[]> {
  const to = new Date();
  const from = new Date();
  // API caps reports at the last 30 days; using exactly 30 got rejected
  // ("Reports can be generated from the last 30 days") since `to` (today,
  // date-only) makes the requested span 31 days inclusive — back off by 29
  // instead to stay inside the boundary.
  from.setDate(from.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const started = await wpFetchV2("/reports/complete_statistics_for_each_level_of_campaign", {
    method: "POST",
    body: JSON.stringify({ from: fmt(from), to: fmt(to) }),
  });
  const hash = started?.hash;
  if (!hash) throw new Error("Woodpecker report request returned no hash");

  for (let attempt = 0; attempt < 15; attempt++) {
    const poll = await wpFetchV2(`/reports/${hash}`);
    if (poll.status === "READY") return poll.report?.data ?? [];
    if (poll.status === "FAILED") throw new Error("Woodpecker report generation failed");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Woodpecker report timed out waiting for READY status");
}

type WoodpeckerProspect = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;
  campaigns_details?: {
    campaign_id: number;
    campaign_prospect_status?: string | null;
    interest_level?: { level?: string | null } | null;
  }[];
};

// Individual prospect rows (email/name/status/interest) per campaign —
// separate from the aggregate/step stats above. campaigns_details=true asks
// for the per-campaign enrollment status and interest level rather than
// just the prospect's global status.
async function fetchWoodpeckerProspects(
  campaignExternalIds: string[]
): Promise<WoodpeckerProspect[]> {
  if (campaignExternalIds.length === 0) return [];
  const ids = campaignExternalIds.join(",");
  const result = await wpFetch(
    `/prospects?campaigns_id=${ids}&campaigns_details=true&per_page=1000`
  );
  return Array.isArray(result) ? result : [];
}

type WoodpeckerCampaign = {
  id: number;
  name: string;
  status: string;
  from_name?: string;
};

type WoodpeckerCampaignDetail = WoodpeckerCampaign & {
  stats?: {
    sent: number;
    bounced: number;
    opened: number;
    clicked: number;
    optout: number;
    delivery: number;
    replied: number;
    interested: number;
    maybe_later: number;
    not_interested: number;
    emails?: { subject?: string; msg?: string }[];
  };
};

export async function syncWoodpecker(): Promise<{
  campaigns: number;
  snapshots: number;
  stepSnapshots: number;
  stepStatsError?: string;
  prospects: number;
  prospectsError?: string;
}> {
  const supabase = supabaseServer();

  const campaignList: WoodpeckerCampaign[] = await wpFetch("/campaign_list");

  const campaignsPayload = campaignList.map((c) => ({
    source: "woodpecker",
    external_id: String(c.id),
    name: c.name,
    owner: c.from_name || null,
    status: c.status || null,
    carrier: classifyCarrier(c.name),
  }));

  const { data: upsertedCampaigns, error: campaignErr } = await supabase
    .from("campaigns")
    .upsert(campaignsPayload, { onConflict: "source,external_id" })
    .select("id, external_id");
  if (campaignErr) throw campaignErr;

  const campaignIdByExternalId = new Map(
    (upsertedCampaigns ?? []).map((c) => [c.external_id, c.id])
  );

  const snapshotPayload = [];
  for (const c of campaignList) {
    const [detail]: WoodpeckerCampaignDetail[] = await wpFetch(
      `/campaign_list?id=${c.id}`
    );
    const s = detail?.stats;
    if (!s) continue;

    snapshotPayload.push({
      campaign_id: campaignIdByExternalId.get(String(c.id)),
      step: null,
      version: null,
      sent: s.sent ?? 0,
      bounced: s.bounced ?? 0,
      bounce_rate: s.sent ? Number(((s.bounced / s.sent) * 100).toFixed(1)) : null,
      opened: s.opened ?? 0,
      opened_rate: s.sent ? Number(((s.opened / s.sent) * 100).toFixed(1)) : null,
      clicked: s.clicked ?? 0,
      opt_out: s.optout ?? 0,
      opt_out_rate: s.sent ? Number(((s.optout / s.sent) * 100).toFixed(1)) : null,
      delivered: s.delivery ?? 0,
      responded: s.replied ?? 0,
      responded_rate: s.sent ? Number(((s.replied / s.sent) * 100).toFixed(1)) : null,
      interested_yes: s.interested ?? null,
      interested_maybe: s.maybe_later ?? null,
      interested_no: s.not_interested ?? null,
    });

    const campaignId = campaignIdByExternalId.get(String(c.id));
    const emailCopy = (s.emails ?? [])
      .filter((e) => e.subject || e.msg)
      .map((e) => ({ subject: e.subject ?? null, msg: e.msg ?? null }));
    if (campaignId && emailCopy.length > 0) {
      await supabase
        .from("campaigns")
        .update({ email_copy: emailCopy })
        .eq("id", campaignId);
    }
  }

  // step/version are always null on this whole-campaign snapshot — see
  // upsert-daily-snapshot.ts: ON CONFLICT can't be inferred against the
  // partial unique index these rows rely on, so read-then-write instead.
  await Promise.all(
    snapshotPayload
      .filter((s): s is typeof s & { campaign_id: number } => s.campaign_id != null)
      .map(({ campaign_id, step: _step, version: _version, ...fields }) =>
        upsertDailySnapshot(supabase, campaign_id, fields)
      )
  );

  let stepSnapshotCount = 0;
  let stepStatsError: string | undefined;
  try {
    const reportRows = await fetchStepStatsReport();
    const stepPayload = reportRows
      .filter((r) => campaignIdByExternalId.has(String(r.id)))
      .map((r) => ({
        campaign_id: campaignIdByExternalId.get(String(r.id)),
        step: r.step,
        version: r.version || null,
        sent: r.sent ?? 0,
        bounced: r.bounced ?? 0,
        bounce_rate: r.bounce_rate ?? null,
        opened: r.opened ?? 0,
        opened_rate: r.opened_rate ?? null,
        clicked: r.clicked ?? 0,
        opt_out: r.opt_out ?? 0,
        opt_out_rate: r.opt_out_rate ?? null,
        delivered: r.delivered ?? 0,
        responded: r.responded ?? 0,
        responded_rate: r.responded_rate ?? null,
        interested_yes: r.interested_yes ?? null,
        interested_maybe: r.interested_maybe ?? null,
        interested_no: r.interested_no ?? null,
      }));

    if (stepPayload.length > 0) {
      const { error: stepErr } = await supabase
        .from("campaign_stats_snapshot")
        .upsert(stepPayload, { onConflict: "campaign_id,step,version,pulled_at" });
      if (stepErr) throw stepErr;
      stepSnapshotCount = stepPayload.length;
    }
  } catch (err) {
    // Step-level stats are additive on top of the aggregate snapshot already
    // saved above — the reports API is async and has its own rate limits,
    // so a hiccup here shouldn't fail the whole sync.
    stepStatsError = errorMessage(err);
    console.error("[sync] woodpecker step stats failed:", err);
  }

  let prospectCount = 0;
  let prospectsError: string | undefined;
  try {
    const externalIds = campaignList.map((c) => String(c.id));
    const prospects = await fetchWoodpeckerProspects(externalIds);

    const prospectPayload: {
      campaign_id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      status: string | null;
      interest_level: string | null;
      updated_at: string;
    }[] = [];
    const now = new Date().toISOString();
    for (const p of prospects) {
      for (const d of p.campaigns_details ?? []) {
        const campaignId = campaignIdByExternalId.get(String(d.campaign_id));
        if (!campaignId) continue;
        prospectPayload.push({
          campaign_id: campaignId,
          email: p.email,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          status: d.campaign_prospect_status ?? p.status ?? null,
          interest_level: d.interest_level?.level ?? null,
          updated_at: now,
        });
      }
    }

    if (prospectPayload.length > 0) {
      const { error: prospectErr } = await supabase
        .from("woodpecker_prospects")
        .upsert(prospectPayload, { onConflict: "campaign_id,email" });
      if (prospectErr) throw prospectErr;
      prospectCount = prospectPayload.length;
    }
  } catch (err) {
    // Prospect-level detail is additive too — don't let it fail the sync.
    prospectsError = errorMessage(err);
    console.error("[sync] woodpecker prospects failed:", err);
  }

  return {
    campaigns: campaignsPayload.length,
    snapshots: snapshotPayload.length,
    stepSnapshots: stepSnapshotCount,
    ...(stepStatsError ? { stepStatsError } : {}),
    prospects: prospectCount,
    ...(prospectsError ? { prospectsError } : {}),
  };
}
