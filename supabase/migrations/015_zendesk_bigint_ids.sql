-- assignee_id/group_id were declared as 4-byte integer (max ~2.1 billion),
-- but Zendesk user/group ids can exceed that range — saw "value
-- '39007108662427' is out of range for type integer" on sync.
alter table zendesk_tickets
  alter column assignee_id type bigint,
  alter column group_id type bigint;
