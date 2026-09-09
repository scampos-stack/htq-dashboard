-- Booked calls captured from the Make.com "Paula calendar connect to keap"
-- scenario (Microsoft 365 Calendar -> Keap) whenever someone books the
-- 15-minute HTQ Discovery call. `source` defaults to microsoft_link since
-- that's the only source this webhook currently feeds — Channel Blend's
-- booked-call count comes from its own "Appointments" upload category, not
-- this table. external_event_id dedupes Make's retries on the same
-- calendar event.
create table if not exists booked_calls (
  id                bigint generated always as identity primary key,
  source            text not null default 'microsoft_link',
  external_event_id text unique,
  contact_name      text,
  contact_email     text,
  event_subject     text,
  scheduled_at      timestamptz,
  created_at        timestamptz not null default now(),
  raw               jsonb
);

create index if not exists idx_booked_calls_scheduled on booked_calls (scheduled_at);
