-- Owner shown on VIP Form Submissions defaults to Keap's record owner, but
-- that's a shared/generic Keap user on this account, not a specific team
-- member — this lets anyone override it per submission (same overlay
-- pattern as status/notes in migration 031, keyed by Keap contact id).
alter table vip_submission_status add column if not exists owner text;
