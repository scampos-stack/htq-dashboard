-- Feedback thread on a LinkedIn post, mirroring broadcast_draft_comments --
-- so Paula can leave "fix the title" directly on the post instead of
-- screenshotting it into Teams.
create table if not exists linkedin_post_comments (
  id bigint generated always as identity primary key,
  linkedin_post_id bigint not null references linkedin_posts(id) on delete cascade,
  author text not null,
  comment text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists linkedin_post_comments_post_id_idx on linkedin_post_comments(linkedin_post_id);
