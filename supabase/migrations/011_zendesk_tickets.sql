-- Zendesk support tickets, synced incrementally (see sync-zendesk.ts).
create table if not exists zendesk_tickets (
  id                   bigint primary key, -- Zendesk's own ticket id, not identity-generated
  subject              text,
  description          text,
  status               text,
  priority             text,
  tags                 text[] not null default '{}',
  requester_email      text,
  requester_name       text,
  satisfaction_score   text,
  satisfaction_comment text,
  created_at           timestamptz,
  updated_at           timestamptz,
  synced_at            timestamptz not null default now()
);

create index if not exists idx_zendesk_tickets_status on zendesk_tickets (status);
create index if not exists idx_zendesk_tickets_updated on zendesk_tickets (updated_at);

-- Generic key/value store for sync cursors — currently just Zendesk's
-- incremental-export end_time, so the next sync picks up where the last
-- one left off instead of re-pulling every ticket every run.
create table if not exists sync_state (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
