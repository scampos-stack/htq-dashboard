-- Supabase stops auto-granting Data API access to new public tables on
-- Oct 30. Existing tables keep their grants, but a replay of the earlier
-- migrations (supabase db reset, preview branches, new projects) would
-- create them without any. The dashboard only talks to Supabase through the
-- service-role key, so only service_role is granted here -- anon and
-- authenticated intentionally get nothing, so no new exposure is opened.
-- Grants are idempotent, safe to re-run on the live database.
--
-- Every future migration that creates a table should include its own
-- `grant select, insert, update, delete on public.<table> to service_role;`.
grant select, insert, update, delete on public.campaigns                 to service_role;
grant select, insert, update, delete on public.campaign_stats_snapshot   to service_role;
grant select, insert, update, delete on public.campaign_stats_daily      to service_role;
grant select, insert, update, delete on public.domain_notes              to service_role;
grant select, insert, update, delete on public.keap_broadcasts           to service_role;
grant select, insert, update, delete on public.channel_blend_dispositions to service_role;
grant select, insert, update, delete on public.channel_blend_uploads     to service_role;
grant select, insert, update, delete on public.keap_automation_events    to service_role;
grant select, insert, update, delete on public.ai_summaries              to service_role;
grant select, insert, update, delete on public.woodpecker_prospects      to service_role;
grant select, insert, update, delete on public.zendesk_tickets           to service_role;
grant select, insert, update, delete on public.sync_state                to service_role;
grant select, insert, update, delete on public.justcall_calls            to service_role;
grant select, insert, update, delete on public.booked_calls              to service_role;
grant select, insert, update, delete on public.broadcast_drafts          to service_role;
grant select, insert, update, delete on public.broadcast_draft_comments  to service_role;
