-- Response/resolution time, pulled separately from GET /api/v2/ticket_metrics
-- (not available on the plain ticket object) and joined back onto existing
-- synced tickets by id — see syncZendeskTicketMetrics in sync-zendesk.ts.
alter table zendesk_tickets
  add column if not exists reply_time_minutes integer,
  add column if not exists full_resolution_time_minutes integer;
