-- Reset only the homestay booking SaaS tables/views/functions created by this project.
-- Use this only while setting up a new Supabase project or when you are OK deleting test data.

drop view if exists public.homestay_booking_stats;

drop table if exists public.topup_requests cascade;
drop table if exists public.credit_ledger cascade;
drop table if exists public.homestay_plans cascade;
drop table if exists public.bookings cascade;
drop table if exists public.room_closures cascade;
drop table if exists public.rooms cascade;
drop table if exists public.homestay_settings cascade;
drop table if exists public.homestay_members cascade;
drop table if exists public.profiles cascade;
drop table if exists public.homestays cascade;

drop function if exists public.set_updated_at() cascade;
