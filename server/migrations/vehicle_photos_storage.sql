-- PUBLIC storage bucket for vehicle photos. Unlike receipts (private + signed
-- URLs), these must be publicly readable so the map WebView and web can load
-- them by plain URL. Run once in the Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;

-- Allow the app (anon key, behind its own JWT) to upload into this bucket.
-- Reads are public (bucket is public), but a select policy is added for parity.
drop policy if exists "vehicle-photos read" on storage.objects;
create policy "vehicle-photos read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vehicle-photos');

drop policy if exists "vehicle-photos insert" on storage.objects;
create policy "vehicle-photos insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'vehicle-photos');
