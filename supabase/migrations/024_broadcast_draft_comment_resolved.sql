-- Separate from `applied` (set only when AI regenerate acts on a comment)
-- -- a writer who addresses feedback by hand needs a way to mark it done
-- without deleting it, so the approval trail stays intact.
alter table broadcast_draft_comments add column if not exists resolved boolean not null default false;
