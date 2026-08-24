alter table campaigns
  add column if not exists email_copy jsonb,
  add column if not exists exclude_from_metrics boolean not null default false;
