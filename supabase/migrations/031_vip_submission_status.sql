-- VIP form submissions come live from Keap (a tag on the contact), with no
-- local row to attach a pipeline status or notes to. This is a thin overlay
-- keyed by the Keap contact id, joined in by getVipSubmissions -- deleting a
-- row here never loses Keap data, it just forgets the status/notes.
create table if not exists vip_submission_status (
  contact_id bigint primary key,
  status     text,
  notes      text,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.vip_submission_status to service_role;
