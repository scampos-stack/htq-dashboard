-- Distinguishes sales/marketing broadcasts from general-purpose ones (e.g.
-- account notices) so the latter can be excluded from sales rollups
-- (getSourceSummary/getCarrierSummary) without being excluded from the
-- broadcast log itself. Defaults existing + new rows to sales_marketing so
-- nothing already logged silently drops out of metrics.
alter table keap_broadcasts add column if not exists category text not null default 'sales_marketing';
