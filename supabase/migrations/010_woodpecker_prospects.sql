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
