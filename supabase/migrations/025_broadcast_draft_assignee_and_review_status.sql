-- Paula's request: a way to see at a glance whose hands a draft is in,
-- separate from status alone (status doesn't say WHO, and "Approved"
-- doesn't distinguish "ready to send" from "still needs changes from
-- Sarah"). assigned_to is a free-text field (UI constrains it to
-- Paula/Sarah/Mohammed) rather than a foreign key, since this isn't tied to
-- dashboard login accounts. The new "review" status value itself needs no
-- schema change -- status is already a plain text column.
alter table broadcast_drafts add column if not exists assigned_to text;
