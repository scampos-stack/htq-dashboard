-- Assignee (agent) info for per-agent ticket volume / response-time
-- reporting. Resolved from the same include=users sideload already used
-- for the requester — see sync-zendesk.ts.
alter table zendesk_tickets
  add column if not exists assignee_id integer,
  add column if not exists assignee_email text,
  add column if not exists assignee_name text;

create index if not exists idx_zendesk_tickets_assignee on zendesk_tickets (assignee_id);
