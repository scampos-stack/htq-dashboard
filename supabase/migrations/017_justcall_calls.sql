-- JustCall call log — inbound/outbound calls and dispositions, synced from
-- their v2.1 /calls API. id is JustCall's own call id, not identity-
-- generated, matching the pattern used for zendesk_tickets.
create table if not exists justcall_calls (
  id                bigint primary key,
  call_sid          text,
  contact_number    text,
  contact_name      text,
  contact_email     text,
  agent_id          bigint,
  agent_name        text,
  agent_email       text,
  call_at           timestamptz not null,
  direction         text,
  call_type         text,
  disposition       text,
  notes             text,
  duration_seconds  int,
  recording_url     text,
  cost_incurred     numeric,
  synced_at         timestamptz not null default now()
);

create index if not exists idx_justcall_calls_call_at on justcall_calls (call_at);
create index if not exists idx_justcall_calls_agent on justcall_calls (agent_name);
create index if not exists idx_justcall_calls_direction on justcall_calls (direction);
