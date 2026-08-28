-- HTQ marketing dashboard schema
-- Generic across sources (Woodpecker, Keap, Zendesk, JustCall, Teamwork, ...)
-- so new sources can be added without restructuring.

create table if not exists campaigns (
  id           bigint generated always as identity primary key,
  source       text not null,              -- 'woodpecker', 'keap', ...
  external_id  text not null,              -- the source platform's own campaign/automation id
  name         text not null,
  owner        text,
  status       text,                       -- e.g. RUNNING, PAUSED, COMPLETED
  category     text,                       -- e.g. 'nurture' vs 'lead_gen' for Keap automations
  carrier      text,                       -- e.g. 'Independent', 'Farmers', 'State Farm'
  email_copy   jsonb,                      -- [{subject, msg}, ...] captured from Woodpecker steps
  exclude_from_metrics boolean not null default false, -- e.g. HTQ University in conversion rollups
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (source, external_id)
);

-- Point-in-time snapshot of a campaign's cumulative totals, as pulled from the
-- source API. One row per (campaign, step, version, pulled_at). Matches the
-- shape of Woodpecker's "complete statistics per campaign" export.
create table if not exists campaign_stats_snapshot (
  id               bigint generated always as identity primary key,
  campaign_id      bigint not null references campaigns(id) on delete cascade,
  step             int,
  version          text,
  pulled_at        date not null default current_date,
  sent             int not null default 0,
  bounced          int not null default 0,
  bounce_rate      numeric,
  opened           int not null default 0,
  opened_rate      numeric,
  clicked          int not null default 0,
  opt_out          int not null default 0,
  opt_out_rate     numeric,
  delivered        int not null default 0,
  responded        int not null default 0,
  responded_rate   numeric,
  interested_yes   int,
  interested_maybe int,
  interested_no    int,
  active_contacts    int,  -- Keap automations: contacts currently mid-sequence
  completed_contacts int,  -- Keap automations: contacts who finished the sequence
  unique (campaign_id, step, version, pulled_at)
);

-- Individual Woodpecker prospects per campaign (email, name, enrollment
-- status, interest level) — separate from campaign_stats_snapshot's
-- aggregate/step counts. Fetched on demand per campaign in the UI rather
-- than embedded in the main page load, since this holds PII and can run to
-- hundreds/thousands of rows per campaign.
create table if not exists woodpecker_prospects (
  id             bigint generated always as identity primary key,
  campaign_id    bigint not null references campaigns(id) on delete cascade,
  email          text not null,
  first_name     text,
  last_name      text,
  status         text,
  interest_level text,
  updated_at     timestamptz not null default now(),
  unique (campaign_id, email)
);

create index if not exists idx_woodpecker_prospects_campaign on woodpecker_prospects (campaign_id);

-- Daily, per-mailbox granularity. Matches Woodpecker's "open rate per
-- campaign" export. This is what daily trend charts and mailbox-health
-- breakdowns are built from.
create table if not exists campaign_stats_daily (
  id           bigint generated always as identity primary key,
  campaign_id  bigint not null references campaigns(id) on delete cascade,
  sent_date    date not null,
  mailbox      text,
  step_number  int,
  version      text,
  sent         int not null default 0,
  delivered    int not null default 0,
  opened       int not null default 0,
  open_rate    numeric,
  unique (campaign_id, sent_date, mailbox, step_number, version)
);

create index if not exists idx_campaign_stats_daily_date on campaign_stats_daily (sent_date);
create index if not exists idx_campaigns_source on campaigns (source);

-- Manual annotations on a sending domain's health status (e.g. explaining a
-- known/expected bounce spike). Freeform, user-editable from the dashboard.
create table if not exists domain_notes (
  domain     text primary key,
  note       text not null,
  updated_at timestamptz not null default now()
);

-- Manual entry: Keap has no API for broadcast (one-off email) performance.
create table if not exists keap_broadcasts (
  id               bigint generated always as identity primary key,
  campaign_name    text not null,
  date_sent        date not null,
  emails_delivered int not null default 0,
  opens            int not null default 0,
  clicks           int not null default 0,
  replies          int not null default 0,
  carrier          text,  -- single carrier name, or 'Blend (Multi-Carrier)'
  created_at       timestamptz not null default now()
);

-- One row per Channel Blend spreadsheet upload — powers an upload history
-- list with a manually-entered period (the sheet doesn't say what date
-- range it covers) and a revert option that removes everything the upload
-- added without touching rows from other uploads.
create table if not exists channel_blend_uploads (
  id           bigint generated always as identity primary key,
  filename     text not null,
  uploaded_at  timestamptz not null default now(),
  period_start date,
  period_end   date,
  row_count    integer not null default 0,
  reverted_at  timestamptz
);

-- Parsed from uploaded Channel Blend (manual outreach) disposition spreadsheets.
-- Category = the source sheet tab (Email Requests / Keap Sent / Appointments /
-- Feedback) — deliberately separate from campaigns.carrier, which this data
-- doesn't include.
create table if not exists channel_blend_dispositions (
  id              bigint generated always as identity primary key,
  row_hash        text not null unique,
  category        text not null,
  lead_name       text,
  new_contact     text,
  phone_number    text,
  state           text,
  email_on_file   text,
  preferred_email text,
  details         text,
  raw             jsonb not null,
  upload_id       bigint references channel_blend_uploads(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_channel_blend_category on channel_blend_dispositions (category);
create index if not exists idx_channel_blend_dispositions_upload on channel_blend_dispositions (upload_id);

-- Events pushed from Keap automation webhook steps (email sent/opened/etc).
create table if not exists keap_automation_events (
  id              bigint generated always as identity primary key,
  automation_id   text,
  automation_name text,
  event_type      text not null,
  contact_email   text,
  occurred_at     timestamptz not null default now(),
  raw             jsonb
);

create index if not exists idx_keap_automation_events_date on keap_automation_events (occurred_at);

-- Cached AI-generated executive summary, one row per dashboard scope
-- (e.g. 'woodpecker'). Regenerated on Sync Now, not on every page view.
create table if not exists ai_summaries (
  id           bigint generated always as identity primary key,
  scope        text not null unique,
  summary      text not null,
  generated_at timestamptz not null default now()
);

-- Zendesk support tickets, synced incrementally (see sync-zendesk.ts).
create table if not exists zendesk_tickets (
  id                           bigint primary key, -- Zendesk's own ticket id, not identity-generated
  subject                      text,
  description                  text,
  status                       text,
  priority                     text,
  tags                         text[] not null default '{}',
  requester_email              text,
  requester_name               text,
  assignee_id                  integer,
  assignee_email                text,
  assignee_name                text,
  group_id                     integer,
  group_name                   text,
  satisfaction_score           text,
  satisfaction_comment         text,
  reply_time_minutes           integer, -- from GET /api/v2/ticket_metrics, joined in separately
  full_resolution_time_minutes integer,
  created_at                   timestamptz,
  updated_at                   timestamptz,
  synced_at                    timestamptz not null default now()
);

create index if not exists idx_zendesk_tickets_status on zendesk_tickets (status);
create index if not exists idx_zendesk_tickets_updated on zendesk_tickets (updated_at);
create index if not exists idx_zendesk_tickets_assignee on zendesk_tickets (assignee_id);
create index if not exists idx_zendesk_tickets_group on zendesk_tickets (group_id);

-- Generic key/value store for sync cursors — currently just Zendesk's
-- incremental-export end_time, so the next sync picks up where the last
-- one left off instead of re-pulling every ticket every run.
create table if not exists sync_state (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
