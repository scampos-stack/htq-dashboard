-- Run this in the Supabase SQL Editor (schema.sql already has this baked in
-- for new installs, but the live table needs it added since it already exists).
alter table campaign_stats_snapshot
  add column if not exists active_contacts int,
  add column if not exists completed_contacts int;
