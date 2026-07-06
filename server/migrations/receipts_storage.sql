-- Migration: private storage bucket for receipts (fuel receipts, PCN/ticket
-- notices, issue photos). Run once in the Supabase SQL Editor
-- (https://supabase.com/dashboard → SQL Editor).
--
-- The bucket is PRIVATE: objects have no public URL. The app server serves them
-- via short-lived signed URLs, so receipts stay behind the app's own auth rather
-- than being world-readable.

-- 1. Create the private bucket
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- 2. Allow the app (which talks to Supabase with the anon key, behind its own
--    JWT auth) to upload / read / delete objects in this bucket only.
--    Matches the existing "Allow all for anon" pattern used elsewhere.
drop policy if exists "receipts read" on storage.objects;
create policy "receipts read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'receipts');

drop policy if exists "receipts insert" on storage.objects;
create policy "receipts insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'receipts');

drop policy if exists "receipts delete" on storage.objects;
create policy "receipts delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'receipts');
