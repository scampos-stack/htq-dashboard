drop view if exists v_channel_performance, v_migration_rate, v_outreach_daily_all, v_retailer_journey;

drop table if exists
  linkedin_daily,
  order_attributions,
  orders,
  outreach_daily,
  prospect_retailer_links,
  prospects,
  retailers,
  sending_domains,
  sync_runs,
  touches,
  "HTQ",
  domain_notes,
  campaign_stats_daily,
  campaign_stats_snapshot,
  campaigns
cascade;

create table campaigns (
  id           bigint generated always as identity primary key,
  source       text not null,
  external_id  text not null,
  name         text not null,
  owner        text,
  status       text,
  category     text,
  carrier      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (source, external_id)
);

create table campaign_stats_snapshot (
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
  active_contacts    int,
  completed_contacts int,
  unique (campaign_id, step, version, pulled_at)
);

create table campaign_stats_daily (
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

create index idx_campaign_stats_daily_date on campaign_stats_daily (sent_date);
create index idx_campaigns_source on campaigns (source);

create table domain_notes (
  domain     text primary key,
  note       text not null,
  updated_at timestamptz not null default now()
);
