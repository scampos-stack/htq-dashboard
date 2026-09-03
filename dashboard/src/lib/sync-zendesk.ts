import { supabaseServer } from "./supabase-server";
import { errorMessage } from "./error-message";

const CURSOR_KEY = "zendesk_tickets_cursor";
const METRICS_CURSOR_KEY = "zendesk_metrics_cursor";
const MAX_PAGES_PER_RUN = 10; // ~10 req/min rate limit on this endpoint

function zdCredentials() {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const email = process.env.ZENDESK_EMAIL;
  const apiToken = process.env.ZENDESK_API_TOKEN;
  if (!subdomain || !email || !apiToken) {
    throw new Error("Missing ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, or ZENDESK_API_TOKEN env var");
  }
  return { subdomain, email, apiToken };
}

async function zdFetch(url: string) {
  const { email, apiToken } = zdCredentials();
  const auth = Buffer.from(`${email}/token:${apiToken}`).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Zendesk API ${url} -> ${res.status} ${res.statusText}${body ? `: ${body}` : ""}`);
  }
  return res.json();
}

type ZendeskTicket = {
  id: number;
  subject: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  tags: string[];
  requester_id: number;
  assignee_id: number | null;
  group_id: number | null;
  created_at: string;
  updated_at: string;
  satisfaction_rating?: { score?: string; comment?: string | null } | null;
};

type ZendeskUser = {
  id: number;
  email: string | null;
  name: string | null;
};

type ZendeskGroup = {
  id: number;
  name: string;
};

// Groups (QC, Sales, Customer Service, Agent Services, etc.) are a small,
// slow-changing list — fetched once per sync run rather than relying on
// per-page sideloading on the incremental export.
async function fetchGroups(): Promise<Map<number, string>> {
  const { subdomain } = zdCredentials();
  const data: { groups?: ZendeskGroup[] } = await zdFetch(
    `https://${subdomain}.zendesk.com/api/v2/groups.json`
  );
  return new Map((data.groups ?? []).map((g) => [g.id, g.name]));
}

type IncrementalResponse = {
  tickets?: ZendeskTicket[];
  users?: ZendeskUser[];
  end_time?: number;
  end_of_stream?: boolean;
  next_page?: string | null;
};

async function getCursor(): Promise<number> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("sync_state")
    .select("value")
    .eq("key", CURSOR_KEY)
    .maybeSingle();
  if (error) throw error;
  if (data?.value) return Number(data.value);

  // First run: start 90 days back rather than the beginning of time, to
  // bound the initial pull. Reset this row in sync_state to backfill older
  // tickets later if needed.
  return Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
}

async function setCursor(endTime: number) {
  const supabase = supabaseServer();
  const { error } = await supabase.from("sync_state").upsert(
    { key: CURSOR_KEY, value: String(endTime), updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) throw error;
}

type ZendeskTicketMetric = {
  ticket_id: number;
  reply_time_in_minutes?: { calendar?: number | null } | null;
  full_resolution_time_in_minutes?: { calendar?: number | null } | null;
};

type TicketMetricsResponse = {
  ticket_metrics?: ZendeskTicketMetric[];
  meta?: { has_more?: boolean };
  links?: { next?: string | null };
};

async function getMetricsCursor(baseUrl: string): Promise<string> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("sync_state")
    .select("value")
    .eq("key", METRICS_CURSOR_KEY)
    .maybeSingle();
  if (error) throw error;
  return data?.value || baseUrl;
}

async function setMetricsCursor(url: string) {
  const supabase = supabaseServer();
  const { error } = await supabase.from("sync_state").upsert(
    { key: METRICS_CURSOR_KEY, value: url, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) throw error;
}

// Reply/resolution time isn't on the plain ticket object — it's a separate
// bulk endpoint, joined back onto already-synced tickets by id. Only
// updates rows that already exist (never inserts), so it can't create a
// partial ticket row.
//
// This endpoint has no "since" filter, only page-to-page cursor links —
// unlike the incremental ticket export above, it always starts at the
// account's *oldest* ticket unless a persisted cursor resumes it. Without
// that, every run re-scanned the same oldest ~1000 tickets (going back to
// account creation), which predate anything actually synced into
// zendesk_tickets — so the id filter matched nothing, every run, forever.
// Confirmed live: 0 of 5,533 synced tickets had ever gotten a
// reply/resolution time before this fix. Persisting `links.next` in
// sync_state (same pattern as the ticket cursor above) makes each run
// continue where the last left off — a few runs to walk through the
// historical backlog, then it naturally settles into picking up newly
// completed tickets at the tail as they appear.
async function syncZendeskTicketMetrics(): Promise<{ metrics: number }> {
  const { subdomain } = zdCredentials();
  const supabase = supabaseServer();

  const { data: existing, error: existingErr } = await supabase
    .from("zendesk_tickets")
    .select("id");
  if (existingErr) throw existingErr;
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  if (existingIds.size === 0) return { metrics: 0 };

  const baseUrl = `https://${subdomain}.zendesk.com/api/v2/ticket_metrics?page[size]=100`;
  let url = await getMetricsCursor(baseUrl);
  let total = 0;

  for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
    const data: TicketMetricsResponse = await zdFetch(url);
    const metrics = data.ticket_metrics ?? [];

    const payload = metrics
      .filter((m) => existingIds.has(m.ticket_id))
      .map((m) => ({
        id: m.ticket_id,
        reply_time_minutes: m.reply_time_in_minutes?.calendar ?? null,
        full_resolution_time_minutes: m.full_resolution_time_in_minutes?.calendar ?? null,
      }));

    if (payload.length > 0) {
      const { error } = await supabase.from("zendesk_tickets").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      total += payload.length;
    }

    // Persist progress every page (not just at the end) so a mid-run
    // failure doesn't lose ground already covered.
    if (data.links?.next) {
      url = data.links.next;
      await setMetricsCursor(url);
    } else {
      // No next link — reached the tail. Keep the current cursor rather
      // than resetting to baseUrl, so next run retries this same spot
      // (which picks up newly-completed tickets appended since).
      break;
    }

    if (!data.meta?.has_more) break;
  }

  return { metrics: total };
}

// Uses Zendesk's Incremental Ticket Export API rather than the plain list
// endpoint — it's built exactly for this (sync jobs that pick up only
// what's new/changed since last run via a time cursor), instead of
// re-pulling every ticket on every sync.
// https://developer.zendesk.com/api-reference/ticketing/ticket-management/incremental_exports/
export async function syncZendesk(): Promise<{
  tickets: number;
  metrics: number;
  metricsError?: string;
}> {
  const { subdomain } = zdCredentials();

  const startTime = await getCursor();
  let url = `https://${subdomain}.zendesk.com/api/v2/incremental/tickets?start_time=${startTime}&include=users`;
  let total = 0;
  let lastEndTime = startTime;

  const supabase = supabaseServer();
  const groupById = await fetchGroups().catch((err) => {
    console.error("[sync] zendesk groups lookup failed:", err);
    return new Map<number, string>();
  });

  for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
    const data: IncrementalResponse = await zdFetch(url);

    const tickets = data.tickets ?? [];
    const users = data.users ?? [];
    const userById = new Map(users.map((u) => [u.id, u]));

    if (tickets.length > 0) {
      const payload = tickets.map((t) => {
        const requester = userById.get(t.requester_id);
        const assignee = t.assignee_id != null ? userById.get(t.assignee_id) : undefined;
        return {
          id: t.id,
          subject: t.subject,
          description: t.description,
          status: t.status,
          priority: t.priority,
          tags: t.tags ?? [],
          requester_email: requester?.email ?? null,
          requester_name: requester?.name ?? null,
          assignee_id: t.assignee_id ?? null,
          assignee_email: assignee?.email ?? null,
          assignee_name: assignee?.name ?? null,
          group_id: t.group_id ?? null,
          group_name: t.group_id != null ? groupById.get(t.group_id) ?? null : null,
          satisfaction_score: t.satisfaction_rating?.score ?? null,
          satisfaction_comment: t.satisfaction_rating?.comment ?? null,
          created_at: t.created_at,
          updated_at: t.updated_at,
          synced_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase.from("zendesk_tickets").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      total += payload.length;
    }

    if (typeof data.end_time === "number") lastEndTime = data.end_time;

    if (data.end_of_stream || !data.next_page) break;
    url = data.next_page;
  }

  await setCursor(lastEndTime);

  let metricsCount = 0;
  let metricsError: string | undefined;
  try {
    const result = await syncZendeskTicketMetrics();
    metricsCount = result.metrics;
  } catch (err) {
    // Additive on top of the ticket sync already saved above — don't fail
    // the whole sync over response-time metrics.
    metricsError = errorMessage(err);
    console.error("[sync] zendesk ticket metrics failed:", err);
  }

  return {
    tickets: total,
    metrics: metricsCount,
    ...(metricsError ? { metricsError } : {}),
  };
}
