-- Generic archive flag per dashboard section (e.g. 'channel_blend'), so a
-- source that goes quiet can be tucked away and brought back later without a
-- code change. Archiving only hides the section from the main flow -- no
-- underlying data is touched, so historical numbers (e.g. Booked Calls) are
-- unaffected.
create table if not exists section_archive (
  section_key text primary key,
  archived    boolean not null default true,
  archived_at timestamptz not null default now(),
  archived_by text
);

grant select, insert, update, delete on public.section_archive to service_role;
