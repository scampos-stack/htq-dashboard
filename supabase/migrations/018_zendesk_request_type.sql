alter table zendesk_tickets add column if not exists request_type text;
create index if not exists idx_zendesk_tickets_request_type on zendesk_tickets (request_type);
