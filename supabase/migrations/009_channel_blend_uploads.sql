-- One row per Channel Blend spreadsheet upload — powers an upload history
-- list with a manually-entered period (the sheet doesn't say what date
-- range it covers) and a revert option that removes everything the upload
-- added without touching rows from other uploads.
create table if not exists channel_blend_uploads (
  id           bigint generated always as identity primary key,
  filename     text not null,
  uploaded_at  timestamptz not null default now(),
  period_start date,
  period_end   date,
  row_count    integer not null default 0,
  reverted_at  timestamptz
);

alter table channel_blend_dispositions
  add column if not exists upload_id bigint references channel_blend_uploads(id) on delete set null;

create index if not exists idx_channel_blend_dispositions_upload on channel_blend_dispositions (upload_id);
