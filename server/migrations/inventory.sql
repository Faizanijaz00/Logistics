-- Inventory Checks: each car should contain a set of expected items, checked on
-- the same weekly cadence as maintenance. Items are ticked off per car; the
-- expected-item list is editable and bulk-importable. Depends on admin_settings
-- (created by maintenance.sql). Run once in the Supabase SQL Editor.

-- Expected items. vehicle_id null = applies to all cars; otherwise car-specific.
create table if not exists public.inventory_items (
  id         text primary key,
  vehicle_id text,
  label      text not null,
  position   integer not null default 0
);

create table if not exists public.inventory_checks (
  id           text primary key,
  vehicle_id   text,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  created_by   text
);

create table if not exists public.inventory_check_items (
  id         text primary key,
  check_id   text references public.inventory_checks(id) on delete cascade,
  item_id    text,
  checked    boolean not null default false,
  checked_at timestamptz
);

create index if not exists inventory_checks_vehicle_idx on public.inventory_checks(vehicle_id);
create index if not exists inventory_check_items_check_idx on public.inventory_check_items(check_id);

-- Seed a few common all-car items (only if the list is empty).
insert into public.inventory_items (id, vehicle_id, label, position)
select * from (values
  (gen_random_uuid()::text, null::text, 'First aid kit', 1),
  (gen_random_uuid()::text, null::text, 'Hi-vis vest', 2),
  (gen_random_uuid()::text, null::text, 'Warning triangle', 3),
  (gen_random_uuid()::text, null::text, 'Ice scraper', 4),
  (gen_random_uuid()::text, null::text, 'Phone charger cable', 5),
  (gen_random_uuid()::text, null::text, 'Spare tyre / repair kit', 6)
) as v(id, vehicle_id, label, position)
where not exists (select 1 from public.inventory_items);

-- Same anon-behind-app-JWT access pattern as the other tables.
alter table public.inventory_items enable row level security;
alter table public.inventory_checks enable row level security;
alter table public.inventory_check_items enable row level security;

drop policy if exists "inventory_items all" on public.inventory_items;
create policy "inventory_items all" on public.inventory_items for all to anon, authenticated using (true) with check (true);

drop policy if exists "inventory_checks all" on public.inventory_checks;
create policy "inventory_checks all" on public.inventory_checks for all to anon, authenticated using (true) with check (true);

drop policy if exists "inventory_check_items all" on public.inventory_check_items;
create policy "inventory_check_items all" on public.inventory_check_items for all to anon, authenticated using (true) with check (true);
