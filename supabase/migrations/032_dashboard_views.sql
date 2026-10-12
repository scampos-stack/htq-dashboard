-- Named, shared, drag-reorderable dashboard layouts -- a view is just an
-- ordered list of widget ids from the catalog (src/lib/dashboard-widgets.ts).
-- Shared across the team (not per-browser), so Paula/Sarah/Mohammed all see
-- the same saved views.
create table if not exists dashboard_views (
  id         bigint generated always as identity primary key,
  name       text not null,
  widget_ids jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.dashboard_views to service_role;
