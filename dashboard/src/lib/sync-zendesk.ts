import { supabaseServer } from "./supabase-server";
import { errorMessage } from "./error-message";

const CURSOR_KEY = "zendesk_tickets_cursor";
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
  custom_fields?: { id: number; value: string | number | boolean | null }[];
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

type ZendeskTicketField = {
  id: number;
  title: string;
  custom_field_options?: { name: string; value: string }[];
};

// "Request Type" is a custom dropdown field, not one of the standard ticket
// properties — found by title match rather than a hardcoded id, since the
// field's numeric id isn't known ahead of time and could differ per Zendesk
// instance. A dropdown option's raw value on the ticket is a tag-like slug
// (e.g. "billing_question"); custom_field_options gives the human label.
async function fetchRequestTypeField(): Promise<{
  fieldId: number | null;
  labelByValue: Map<string, string>;
}> {
  const { subdomain } = zdCredentials();
  const data: { ticket_fields?: ZendeskTicketField[] } = await zdFetch(
    `https://${subdomain}.zendesk.com/api/v2/ticket_fields.json`
  );
  const field = (data.ticket_fields ?? []).find((f) => /request type/i.test(f.title));
  if (!field) {
    console.error('[sync] zendesk: no ticket field titled "Request Type" found — request_type will stay null');
    return { fieldId: null, labelByValue: new Map() };
  }
  const labelByValue = new Map((field.custom_field_options ?? []).map((o) => [o.value, o.name]));
  return { fieldId: field.id, labelByValue };
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

type TicketMetricResponse = {
  ticket_metric?: {
    reply_time_in_minutes?: { calendar?: number | null } | null;
    full_resolution_time_in_minutes?: { calendar?: number | null } | null;
  };
};

const MAX_TICKETS_PER_RUN = 50;

// Reply/resolution time isn't on the plain ticket object — it's a separate
// per-ticket endpoint, joined back onto already-synced tickets by id.
//
// Previously used the bulk /ticket_metrics list endpoint with a persisted
// page cursor, on the assumption that re-fetching the last page's "next"
// link would surface newly-completed tickets appended after it. Confirmed
// live that assumption was wrong: the cursor sat completely unchanged for
// 5 days straight (zero new rows, zero errors) — retrying that dead-end
// URL doesn't actually reveal new items the way cursor pagination normally
// does. Switched to querying per-ticket instead: pick the N most-recently-
// created tickets still missing a reply time and hit each one's own
// /tickets/{id}/metrics endpoint directly. No cursor, no pagination edge
// cases, and it always prioritizes the tickets the dashboard actually
// shows (recent ones) over ancient history nobody's looking at.
async function syncZendeskTicketMetrics(): Promise<{ metrics: number }> {
  const { subdomain } = zdCredentials();
  const supabase = supabaseServer();

  const { data: missing, error: missingErr } = await supabase
    .from("zendesk_tickets")
    .select("id")
    .is("reply_time_minutes", null)
    .order("created_at", { ascending: false })
    .limit(MAX_TICKETS_PER_RUN);
  if (missingErr) throw missingErr;
  if (!missing?.length) return { metrics: 0 };

  let total = 0;
  for (const { id } of missing) {
    const data: TicketMetricResponse = await zdFetch(
      `https://${subdomain}.zendesk.com/api/v2/tickets/${id}/metrics`
    );
    const m = data.ticket_metric;
    if (!m) continue;

    const { error } = await supabase
      .from("zendesk_tickets")
      .update({
        reply_time_minutes: m.reply_time_in_minutes?.calendar ?? null,
        full_resolution_time_minutes: m.full_resolution_time_in_minutes?.calendar ?? null,
      })
      .eq("id", id);
    if (error) throw error;
    total += 1;
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
  const { fieldId: requestTypeFieldId, labelByValue: requestTypeLabels } = await fetchRequestTypeField().catch(
    (err) => {
      console.error("[sync] zendesk request type field lookup failed:", err);
      return { fieldId: null, labelByValue: new Map<string, string>() };
    }
  );

  for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
    const data: IncrementalResponse = await zdFetch(url);

    const tickets = data.tickets ?? [];
    const users = data.users ?? [];
    const userById = new Map(users.map((u) => [u.id, u]));

    if (tickets.length > 0) {
      const payload = tickets.map((t) => {
        const requester = userById.get(t.requester_id);
        const assignee = t.assignee_id != null ? userById.get(t.assignee_id) : undefined;
        const requestTypeRaw =
          requestTypeFieldId != null
            ? t.custom_fields?.find((f) => f.id === requestTypeFieldId)?.value
            : null;
        const requestType =
          requestTypeRaw != null && requestTypeRaw !== ""
            ? requestTypeLabels.get(String(requestTypeRaw)) ?? String(requestTypeRaw)
            : null;
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
          request_type: requestType,
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
