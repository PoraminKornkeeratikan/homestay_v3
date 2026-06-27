-- Development table policies for the current static frontend.
-- Run this only while the project is still using the anon key without owner login.
-- Tighten these policies before launching with real customers.

alter table public.homestays enable row level security;
alter table public.homestay_settings enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.homestay_plans enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.topup_requests enable row level security;

drop policy if exists "dev anon select homestays" on public.homestays;
drop policy if exists "dev anon insert homestays" on public.homestays;
drop policy if exists "dev anon update homestays" on public.homestays;
drop policy if exists "dev anon delete homestays" on public.homestays;
drop policy if exists "dev anon select homestay settings" on public.homestay_settings;
drop policy if exists "dev anon upsert homestay settings" on public.homestay_settings;
drop policy if exists "dev anon select rooms" on public.rooms;
drop policy if exists "dev anon insert rooms" on public.rooms;
drop policy if exists "dev anon update rooms" on public.rooms;
drop policy if exists "dev anon delete rooms" on public.rooms;
drop policy if exists "dev anon select bookings" on public.bookings;
drop policy if exists "dev anon insert bookings" on public.bookings;
drop policy if exists "dev anon update bookings" on public.bookings;
drop policy if exists "dev anon delete bookings" on public.bookings;
drop policy if exists "dev anon select homestay plans" on public.homestay_plans;
drop policy if exists "dev anon insert homestay plans" on public.homestay_plans;
drop policy if exists "dev anon update homestay plans" on public.homestay_plans;
drop policy if exists "dev anon select credit ledger" on public.credit_ledger;
drop policy if exists "dev anon insert credit ledger" on public.credit_ledger;
drop policy if exists "dev anon select topup requests" on public.topup_requests;
drop policy if exists "dev anon insert topup requests" on public.topup_requests;
drop policy if exists "dev anon update topup requests" on public.topup_requests;

create policy "dev anon select homestays"
on public.homestays for select to anon
using (true);

create policy "dev anon insert homestays"
on public.homestays for insert to anon
with check (true);

create policy "dev anon update homestays"
on public.homestays for update to anon
using (true)
with check (true);

create policy "dev anon delete homestays"
on public.homestays for delete to anon
using (true);

create policy "dev anon select homestay settings"
on public.homestay_settings for select to anon
using (true);

create policy "dev anon upsert homestay settings"
on public.homestay_settings for all to anon
using (true)
with check (true);

create policy "dev anon select rooms"
on public.rooms for select to anon
using (true);

create policy "dev anon insert rooms"
on public.rooms for insert to anon
with check (true);

create policy "dev anon update rooms"
on public.rooms for update to anon
using (true)
with check (true);

create policy "dev anon delete rooms"
on public.rooms for delete to anon
using (true);

create policy "dev anon select bookings"
on public.bookings for select to anon
using (true);

create policy "dev anon insert bookings"
on public.bookings for insert to anon
with check (true);

create policy "dev anon update bookings"
on public.bookings for update to anon
using (true)
with check (true);

create policy "dev anon delete bookings"
on public.bookings for delete to anon
using (true);

create policy "dev anon select homestay plans"
on public.homestay_plans for select to anon
using (true);

create policy "dev anon insert homestay plans"
on public.homestay_plans for insert to anon
with check (true);

create policy "dev anon update homestay plans"
on public.homestay_plans for update to anon
using (true)
with check (true);

create policy "dev anon select credit ledger"
on public.credit_ledger for select to anon
using (true);

create policy "dev anon insert credit ledger"
on public.credit_ledger for insert to anon
with check (true);

create policy "dev anon select topup requests"
on public.topup_requests for select to anon
using (true);

create policy "dev anon insert topup requests"
on public.topup_requests for insert to anon
with check (true);

create policy "dev anon update topup requests"
on public.topup_requests for update to anon
using (true)
with check (true);
