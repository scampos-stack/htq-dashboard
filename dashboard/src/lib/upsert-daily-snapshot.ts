import type { SupabaseClient } from "@supabase/supabase-js";

// campaign_stats_snapshot's whole-campaign rows always have step/version =
// null, and Postgres treats NULL <> NULL in unique constraints — so a plain
// table-wide unique(campaign_id, step, version, pulled_at) never catches
// same-day reruns for these rows. A partial unique index scoped to
// step/version IS NULL (migrations/016) fixes true uniqueness at the DB
// level, but Postgres can only infer a *partial* index for ON CONFLICT when
// the same WHERE predicate is repeated in the conflict target — something
// Supabase's upsert()/PostgREST's on_conflict param has no way to express
// (it only accepts a bare column list). So this reads-then-writes instead
// of relying on ON CONFLICT for this one row shape.
export async function upsertDailySnapshot(
  supabase: SupabaseClient,
  campaignId: number,
  fields: Record<string, unknown>
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: selectErr } = await supabase
    .from("campaign_stats_snapshot")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("pulled_at", today)
    .is("step", null)
    .is("version", null)
    .maybeSingle();
  if (selectErr) throw selectErr;

  if (existing) {
    const { error } = await supabase
      .from("campaign_stats_snapshot")
      .update(fields)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("campaign_stats_snapshot")
      .insert({ campaign_id: campaignId, step: null, version: null, ...fields });
    if (error) throw error;
  }
}
