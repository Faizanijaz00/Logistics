-- Maintenance Checks: weekly per-car checklist with an OVERDUE flag (7+ days
-- since last completed check). An admin manually marks which car is currently
-- "in rotation". Run once in the Supabase SQL Editor.

-- Small key/value store, shared with Inventory, for the "in rotation" car etc.
create table if not exists public.admin_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- Reusable master checklist (editable; applies to every car's future checks).
create table if not exists public.maintenance_checklist_items (
  id       text primary key,
  label    text not null,
  position integer not null default 0
);

-- One check run for a car.
create table if not exists public.maintenance_checks (
  id           text primary key,
  vehicle_id   text,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  created_by   text
);

-- Per-run tick for each checklist item.
create table if not exists public.maintenance_check_items (
  id         text primary key,
  check_id   text references public.maintenance_checks(id) on delete cascade,
  item_id    text,
  checked    boolean not null default false,
  checked_at timestamptz
);

create index if not exists maintenance_checks_vehicle_idx on public.maintenance_checks(vehicle_id);
create index if not exists maintenance_check_items_check_idx on public.maintenance_check_items(check_id);

-- Seed a few sensible defaults (only if the master list is empty).
insert into public.maintenance_checklist_items (id, label, position)
select * from (values
  (gen_random_uuid()::text, 'Tyre pressure & tread', 1),
  (gen_random_uuid()::text, 'Engine oil level', 2),
  (gen_random_uuid()::text, 'Coolant / washer fluid', 3),
  (gen_random_uuid()::text, 'Lights (head, brake, indicators)', 4),
  (gen_random_uuid()::text, 'Wipers & screen', 5),
  (gen_random_uuid()::text, 'Bodywork / damage check', 6),
  (gen_random_uuid()::text, 'Interior clean & tidy', 7)
) as v(id, label, position)
where not exists (select 1 from public.maintenance_checklist_items);

-- Same anon-behind-app-JWT access pattern as the other tables.
alter table public.admin_settings enable row level security;
alter table public.maintenance_checklist_items enable row level security;
alter table public.maintenance_checks enable row level security;
alter table public.maintenance_check_items enable row level security;

drop policy if exists "admin_settings all" on public.admin_settings;
create policy "admin_settings all" on public.admin_settings for all to anon, authenticated using (true) with check (true);

drop policy if exists "maintenance_checklist_items all" on public.maintenance_checklist_items;
create policy "maintenance_checklist_items all" on public.maintenance_checklist_items for all to anon, authenticated using (true) with check (true);

drop policy if exists "maintenance_checks all" on public.maintenance_checks;
create policy "maintenance_checks all" on public.maintenance_checks for all to anon, authenticated using (true) with check (true);

drop policy if exists "maintenance_check_items all" on public.maintenance_check_items;
create policy "maintenance_check_items all" on public.maintenance_check_items for all to anon, authenticated using (true) with check (true);
