-- Links a broadcast draft to the keap_broadcasts row auto-created when its
-- status is set to "sent" (see api/broadcast-drafts/[id]/route.ts), so
-- re-saving "sent" doesn't create a duplicate log entry. Null for drafts
-- never marked sent, or sent before this existed.
alter table broadcast_drafts add column if not exists logged_broadcast_id bigint references keap_broadcasts(id) on delete set null;
