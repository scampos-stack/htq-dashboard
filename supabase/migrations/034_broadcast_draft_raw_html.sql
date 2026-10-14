-- Every draft so far has been forced through a fixed set of fields
-- (intro/highlight/CTA/closing/signoff/footer) re-rendered by one fixed
-- template -- fine for the common HTQ shape, but it silently discards
-- anything that doesn't fit (a video thumbnail, a numbered list, a
-- one-off button style, a multi-line footer). When raw_html is set, the
-- preview and "Copy HTML for Keap" use it verbatim instead of rebuilding
-- from the structured fields -- those fields still get a best-effort fill
-- on paste/upload, for display, but no longer gate what can actually be
-- sent. Null means "render from the structured fields," same as today.
alter table broadcast_drafts add column if not exists raw_html text;
