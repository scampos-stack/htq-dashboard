-- Run this in the Supabase SQL Editor.

alter table campaigns
  add column if not exists carrier text; -- e.g. 'Independent', 'Farmers', 'State Farm'

create table if not exists domain_notes (
  domain     text primary key,
  note       text not null,
  updated_at timestamptz not null default now()
);
