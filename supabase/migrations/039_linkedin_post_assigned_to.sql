-- So a LinkedIn post can be handed to someone the same way a broadcast
-- draft can — visible on the row, and triggers the same assignee-change
-- email the drafts flow already sends.
alter table linkedin_posts add column if not exists assigned_to text;
