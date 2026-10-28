-- A separate internal label for the agenda/queue — distinct from the post
-- body, which previously doubled as the title (editing it rewrote the
-- post's first line, which isn't what "update the title" should do).
alter table linkedin_posts add column if not exists title text;

-- Backfill existing rows so they still show something meaningful instead of
-- going blank — the post's first non-empty line, same text that used to be
-- shown as the de-facto title.
update linkedin_posts
set title = trim(split_part(content, E'\n', 1))
where title is null;
