-- Zendesk Group (team) a ticket belongs to — e.g. QC, Sales, Customer
-- Service, Agent Services — separate from the individual assignee.
alter table zendesk_tickets
  add column if not exists group_id integer,
  add column if not exists group_name text;

create index if not exists idx_zendesk_tickets_group on zendesk_tickets (group_id);
