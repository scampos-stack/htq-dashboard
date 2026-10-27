-- `source` was conflating two different questions: WHICH Bookings page was
-- used (email marketing / Happen Media / website / LinkedIn) and HOW the
-- call was booked (self-booked online vs. an agent called in and someone
-- booked it for them) -- the old values "microsoft_link" and
-- "agent_call_in" actually only ever answered the second question, not the
-- first. Splitting them into separate columns so each can get its own pie
-- chart instead of being forced into one.
alter table booked_calls add column if not exists how_booked text;

update booked_calls
set how_booked = case
  when source = 'microsoft_link' then 'self_booked'
  when source = 'agent_call_in' then 'call_in'
  else how_booked
end
where source in ('microsoft_link', 'agent_call_in');

-- These legacy rows predate per-page tracking, so which Bookings page they
-- came from genuinely isn't known -- "unknown" is honest, not a guess.
update booked_calls
set source = 'unknown'
where source in ('microsoft_link', 'agent_call_in');
