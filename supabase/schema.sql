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
  unique (campaign_id, step, version, pulled_at)
);

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
