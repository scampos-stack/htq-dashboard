create table if not exists ai_summaries (
  id           bigint generated always as identity primary key,
  scope        text not null unique,  -- e.g. 'woodpecker'
  summary      text not null,
  generated_at timestamptz not null default now()
);
