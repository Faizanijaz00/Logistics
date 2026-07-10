-- SOPs (standard operating procedures): each has a title and supports BOTH
-- typed text (body) AND an optional file attachment (PDF/image). Run once in
-- the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor).

create table if not exists public.sops (
  id              text primary key,
  title           text not null,
  body            text,
  attachment_path text,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Same anon-behind-app-JWT access pattern as the other tables.
alter table public.sops enable row level security;

drop policy if exists "sops all" on public.sops;
create policy "sops all" on public.sops
  for all to anon, authenticated
  using (true)
  with check (true);
