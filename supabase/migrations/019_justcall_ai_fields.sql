-- JustCall AI call-analysis fields (call_moments/topics, call_score,
-- customer_sentiment) — only populated for analyzed calls (answered, with
-- real duration); missed calls carry empty/zero values.
alter table justcall_calls add column if not exists call_score int;
alter table justcall_calls add column if not exists customer_sentiment text;
alter table justcall_calls add column if not exists call_moments text[];

create index if not exists idx_justcall_calls_sentiment on justcall_calls (customer_sentiment);
