-- Payments: log a purchase — what was bought (item), how much (amount), where
-- from (vendor), and an optional receipt photo. Run once in the Supabase SQL
-- Editor (https://supabase.com/dashboard → SQL Editor).

create table if not exists public.payments (
  id           text primary key,
  item         text not null,
  amount       numeric,
  vendor       text,
  receipt_path text,
  created_by   text,
  created_at   timestamptz not null default now()
);

-- Same anon-behind-app-JWT access pattern as the other tables.
alter table public.payments enable row level security;

drop policy if exists "payments all" on public.payments;
create policy "payments all" on public.payments
  for all to anon, authenticated
  using (true)
  with check (true);
