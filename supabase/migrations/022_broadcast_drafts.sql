-- Planning/approval workflow for upcoming Keap broadcasts, separate from
-- keap_broadcasts (which logs already-SENT broadcasts for stats). Content
-- is stored as structured fields, not raw HTML, so an AI regenerate can
-- target one named field from a comment ("make the CTA punchier") instead
-- of hunting through a wall of markup — every draft renders through one
-- shared template function for visual consistency.
create table if not exists broadcast_drafts (
  id                bigint generated always as identity primary key,
  campaign_theme    text not null,
  target_date       date not null,
  list_segment      text not null,
  focus             text,                     -- e.g. 'Sales', 'Nurture / Hometown University evergreen'
  utm_campaign      text,
  audience_estimate int,
  status            text not null default 'not_started', -- not_started | writing | for_approval | approved | sent
  version           int not null default 1,

  -- structured email content
  subject           text,
  preheader         text,
  intro_paragraphs  jsonb not null default '[]', -- string[]
  highlight_heading  text,
  highlight_body     text,
  cta_text          text,
  cta_url           text,
  closing_paragraph text,
  signoff_line      text,
  signoff_subtext   text,
  footer_note_text     text,
  footer_note_link_text text,
  footer_note_link_url  text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_broadcast_drafts_target_date on broadcast_drafts (target_date);

create table if not exists broadcast_draft_comments (
  id          bigint generated always as identity primary key,
  draft_id    bigint not null references broadcast_drafts(id) on delete cascade,
  author      text not null,
  comment     text not null,
  applied     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_broadcast_draft_comments_draft on broadcast_draft_comments (draft_id);
