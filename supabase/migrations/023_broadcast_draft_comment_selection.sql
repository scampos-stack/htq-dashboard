-- Lets a comment anchor to the exact phrase the commenter selected in the
-- preview (e.g. highlighting "a lead vendor" and commenting "make this
-- punchier"), so the AI regenerate step gets precise context instead of a
-- comment alone having to describe what it's about.
alter table broadcast_draft_comments add column if not exists selected_text text;
