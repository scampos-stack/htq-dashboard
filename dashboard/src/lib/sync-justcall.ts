import { supabaseServer } from "./supabase-server";

const API_BASE = "https://api.justcall.io/v2.1";
const CURSOR_KEY = "justcall_calls_cursor";
const MAX_PAGES_PER_RUN = 20; // 100/page = up to 2,000 calls/run

// JustCall's date filter only accepts "YYYY-MM-DD HH:MM:SS" (space, not
// ISO's "T"/"Z") — confirmed live: the ISO form silently returns a
// malformed response instead of an error.
function toJustCallDatetime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function justcallCredentials() {
  const apiKey = process.env.JUSTCALL_API_KEY;
  const apiSecret = process.env.JUSTCALL_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("Missing JUSTCALL_API_KEY or JUSTCALL_API_SECRET env var");
  }
  return { apiKey, apiSecret };
}

async function jcFetch(url: string) {
  const { apiKey, apiSecret } = justcallCredentials();
  const res = await fetch(url, {
    headers: { Authorization: `${apiKey}:${apiSecret}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`JustCall API ${url} -> ${res.status} ${res.statusText}${body ? `: ${body}` : ""}`);
  }
  return res.json();
}

async function getCursor(): Promise<string> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("sync_state")
    .select("value")
    .eq("key", CURSOR_KEY)
    .maybeSingle();
  if (error) throw error;
  if (data?.value) return data.value;

  // First run: start 90 days back, same convention as the Zendesk ticket
  // cursor, rather than pulling the full account history in one go.
  const since = new Date();
  since.setDate(since.getDate() - 90);
  return toJustCallDatetime(since);
}

async function setCursor(value: string) {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("sync_state")
    .upsert({ key: CURSOR_KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

type JustCallCall = {
  id: number;
  call_sid: string;
  contact_number: string;
  contact_name: string;
  contact_email: string;
  agent_id: number | null;
  agent_name: string | null;
  agent_email: string | null;
  call_date: string;
  call_time: string;
  cost_incurred: number | null;
  call_info: {
    direction: string;
    type: string;
    disposition: string;
    notes: string;
    recording: string;
  };
  call_duration: {
    total_duration: number;
  };
  justcall_ai?: {
    call_moments?: string[];
    call_score?: number;
    customer_sentiment?: string;
  };
};

type CallsResponse = {
  data?: JustCallCall[];
  next_page_link?: string | null;
};

const MAX_AI_BACKFILL_PER_RUN = 50;

// The main sync loop above only ever touches calls from the cursor forward
// (new calls) — it can't retroactively add AI data to calls that were
// already synced before fetch_ai_data=true existed. Confirmed live: 0 of
// 2,749 already-synced calls had call_score populated, since barely any
// new calls had landed since. Same fix as the Zendesk ticket-metrics
// backfill: pick the N most-recently-called calls still missing AI data
// and re-fetch each one individually by id. Calls with 0 duration (missed/
// bot dials) never get analyzed by JustCall in the first place, so they're
// excluded rather than wasting a request confirming they're still empty.
async function backfillJustCallAiData(): Promise<number> {
  const supabase = supabaseServer();

  const { data: missing, error: missingErr } = await supabase
    .from("justcall_calls")
    .select("id")
    .is("call_score", null)
    .gt("duration_seconds", 0)
    .order("call_at", { ascending: false })
    .limit(MAX_AI_BACKFILL_PER_RUN);
  if (missingErr) throw missingErr;
  if (!missing?.length) return 0;

  let total = 0;
  for (const { id } of missing) {
    const data: { data?: JustCallCall } = await jcFetch(`${API_BASE}/calls/${id}?fetch_ai_data=true`);
    const c = data.data;
    if (!c) continue;

    const { error } = await supabase
      .from("justcall_calls")
      .update({
        call_score: c.justcall_ai?.call_score || null,
        customer_sentiment: c.justcall_ai?.customer_sentiment || null,
        call_moments: c.justcall_ai?.call_moments?.length ? c.justcall_ai.call_moments : null,
      })
      .eq("id", id);
    if (error) throw error;
    total += 1;
  }

  return total;
}

export async function syncJustCall(): Promise<{
  calls: number;
  cappedByRateLimit: boolean;
  aiBackfilled: number;
}> {
  const supabase = supabaseServer();
  const since = await getCursor();

  // Oldest-first (not the API's newest-first default) is required for
  // correct incremental catch-up: if a backlog is bigger than one run can
  // process, capping mid-page must advance the cursor only as far as
  // what's actually been processed. With newest-first results, capping
  // would jump the cursor straight to "now" while silently skipping every
  // older unprocessed call in between — permanently, since nothing revisits
  // that gap afterward.
  let url = `${API_BASE}/calls?per_page=100&fetch_ai_data=true&from_datetime=${encodeURIComponent(since)}&sort=id&order=asc`;
  let total = 0;
  let latestCallAt: string | null = null;
  let cappedByRateLimit = false;

  for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
    const data: CallsResponse = await jcFetch(url);
    const calls = data.data ?? [];

    const payload = calls.map((c) => {
      // call_date/call_time are UTC (confirmed against call_user_time, which
      // is consistently offset by the account's local timezone).
      const callAt = new Date(`${c.call_date}T${c.call_time}Z`).toISOString();
      if (!latestCallAt || callAt > latestCallAt) latestCallAt = callAt;
      return {
        id: c.id,
        call_sid: c.call_sid,
        contact_number: c.contact_number || null,
        contact_name: c.contact_name || null,
        contact_email: c.contact_email || null,
        agent_id: c.agent_id,
        agent_name: c.agent_name || null,
        agent_email: c.agent_email || null,
        call_at: callAt,
        direction: c.call_info?.direction || null,
        call_type: c.call_info?.type || null,
        disposition: c.call_info?.disposition || null,
        notes: c.call_info?.notes || null,
        duration_seconds: c.call_duration?.total_duration ?? null,
        recording_url: c.call_info?.recording || null,
        cost_incurred: c.cost_incurred ?? null,
        // Only populated for analyzed calls (answered, with real duration) —
        // missed calls come back with score 0 / empty sentiment / no moments.
        call_score: c.justcall_ai?.call_score || null,
        customer_sentiment: c.justcall_ai?.customer_sentiment || null,
        call_moments: c.justcall_ai?.call_moments?.length ? c.justcall_ai.call_moments : null,
      };
    });

    if (payload.length > 0) {
      const { error } = await supabase.from("justcall_calls").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      total += payload.length;
    }

    if (!data.next_page_link) break;
    url = data.next_page_link;
    if (page === MAX_PAGES_PER_RUN - 1) cappedByRateLimit = true;
  }

  // Reached the end of what's new (no more pages) — safe to advance the
  // cursor to now. If capped mid-backlog instead, advance only to the
  // latest call actually processed so next run continues rather than
  // skipping whatever's still unprocessed between there and now.
  await setCursor(
    cappedByRateLimit && latestCallAt
      ? toJustCallDatetime(new Date(latestCallAt))
      : toJustCallDatetime(new Date())
  );

  // Additive on top of the call sync already saved above — don't fail the
  // whole sync over AI backfill.
  let aiBackfilled = 0;
  try {
    aiBackfilled = await backfillJustCallAiData();
  } catch (err) {
    console.error("[sync] justcall AI backfill failed:", err);
  }

  return { calls: total, cappedByRateLimit, aiBackfilled };
}
