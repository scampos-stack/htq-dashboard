create table if not exists keap_broadcasts (
  id               bigint generated always as identity primary key,
  campaign_name    text not null,
  date_sent        date not null,
  emails_delivered int not null default 0,
  opens            int not null default 0,
  clicks           int not null default 0,
  replies          int not null default 0,
  created_at       timestamptz not null default now()
);

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
  created_at      timestamptz not null default now()
);

create index if not exists idx_channel_blend_category on channel_blend_dispositions (category);

create table if not exists keap_automation_events (
  id           bigint generated always as identity primary key,
  automation_id text,
  automation_name text,
  event_type   text not null,
  contact_email text,
  occurred_at  timestamptz not null default now(),
  raw          jsonb
);

create index if not exists idx_keap_automation_events_date on keap_automation_events (occurred_at);
