-- Queue for "turn this campaign into a LinkedIn post" — AI drafts a post
-- (and reuses an image from the source email's HTML when one's there), a
-- human reviews/edits/approves it here, then publishes it manually on
-- LinkedIn itself (no LinkedIn API integration — this is a tracker, not
-- auto-publish).
create table if not exists linkedin_posts (
  id bigint generated always as identity primary key,
  broadcast_draft_id bigint references broadcast_drafts(id) on delete set null,
  content text not null,
  image_url text,
  account text not null default 'HTQ main',
  status text not null default 'draft' check (status in ('draft', 'approved', 'scheduled', 'published')),
  scheduled_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists linkedin_posts_status_idx on linkedin_posts(status);
create index if not exists linkedin_posts_broadcast_draft_id_idx on linkedin_posts(broadcast_draft_id);
