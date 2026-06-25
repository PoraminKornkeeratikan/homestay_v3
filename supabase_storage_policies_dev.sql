-- Development Storage policies for the current static frontend.
-- Run this in Supabase SQL Editor after creating these buckets:
-- 1) homestay-assets  (public)
-- 2) payment-slips    (private)
--
-- Important: these policies are intentionally permissive for development because
-- the frontend is still using the anon key without Supabase Auth/RLS membership.
-- Tighten these policies before launching with real customers.

drop policy if exists "dev public read homestay assets" on storage.objects;
drop policy if exists "dev upload homestay assets" on storage.objects;
drop policy if exists "dev update homestay assets" on storage.objects;
drop policy if exists "dev upload payment slips" on storage.objects;
drop policy if exists "dev read payment slips" on storage.objects;
drop policy if exists "dev update payment slips" on storage.objects;

create policy "dev public read homestay assets"
on storage.objects
for select
to anon
using (bucket_id = 'homestay-assets');

create policy "dev upload homestay assets"
on storage.objects
for insert
to anon
with check (bucket_id = 'homestay-assets');

create policy "dev update homestay assets"
on storage.objects
for update
to anon
using (bucket_id = 'homestay-assets')
with check (bucket_id = 'homestay-assets');

create policy "dev upload payment slips"
on storage.objects
for insert
to anon
with check (bucket_id = 'payment-slips');

create policy "dev read payment slips"
on storage.objects
for select
to anon
using (bucket_id = 'payment-slips');

create policy "dev update payment slips"
on storage.objects
for update
to anon
using (bucket_id = 'payment-slips')
with check (bucket_id = 'payment-slips');
