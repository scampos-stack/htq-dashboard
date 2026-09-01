-- campaign_stats_snapshot's unique(campaign_id, step, version, pulled_at)
-- constraint never caught same-day reruns for Keap automation rows, since
-- those always have step/version = null and Postgres treats NULL <> NULL
-- in unique constraints. Every daily sync run was inserting a fresh
-- duplicate instead of upserting onto that day's existing row.

-- Dedupe existing duplicates first, keeping the most recently inserted row
-- per (campaign_id, pulled_at) among the null-step/null-version rows.
delete from campaign_stats_snapshot a
using campaign_stats_snapshot b
where a.step is null
  and a.version is null
  and b.step is null
  and b.version is null
  and a.campaign_id = b.campaign_id
  and a.pulled_at = b.pulled_at
  and a.id < b.id;

-- Partial unique index scoped to the null-step/null-version case (the shape
-- Keap automation snapshots always use) so future upserts targeting
-- (campaign_id, pulled_at) actually catch same-day reruns. Doesn't affect
-- Woodpecker's per-step snapshot rows, which always set a real step/version.
create unique index if not exists campaign_stats_snapshot_keap_daily_uidx
  on campaign_stats_snapshot (campaign_id, pulled_at)
  where step is null and version is null;
