-- Highlight boxes come in two real styles: a short plain paragraph
-- (existing highlight_body) or a bulleted recap list (this column) -- the
-- form couldn't produce the bulleted style at all before (single-line input,
-- no way to type multiple lines), and the HTML parser flattened real
-- bulleted highlight boxes into one run-on string with no line breaks.
alter table broadcast_drafts add column if not exists highlight_bullets jsonb not null default '[]';
