-- closing_paragraph (single string) silently dropped every closing
-- paragraph after the first when importing real emails that have several
-- (e.g. "HTQ currently integrates with...", "Why This Matters", "A lead is
-- worth the most...") -- upgraded to an array, same pattern as
-- intro_paragraphs. The old column stays for now as a fallback for rows
-- written before this migration; new writes go to closing_paragraphs only.
alter table broadcast_drafts add column if not exists closing_paragraphs jsonb not null default '[]';
