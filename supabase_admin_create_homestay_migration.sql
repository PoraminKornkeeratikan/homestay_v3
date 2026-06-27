-- Allow the static Admin page to create new homestays during development.
-- Run this in Supabase SQL Editor while using the anon key frontend.
-- Tighten these policies before production.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.homestays (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  page_url text,
  gps_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homestays
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists page_url text,
  add column if not exists gps_url text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.homestays
  alter column status set default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'homestays_status_check'
      and conrelid = 'public.homestays'::regclass
  ) then
    alter table public.homestays
      add constraint homestays_status_check
      check (status in ('active', 'inactive', 'suspended'));
  end if;
end $$;

drop trigger if exists set_homestays_updated_at on public.homestays;
create trigger set_homestays_updated_at
before update on public.homestays
for each row execute function public.set_updated_at();

create table if not exists public.homestay_settings (
  homestay_id uuid primary key references public.homestays(id) on delete cascade,
  site_name text not null default '',
  logo_url text,
  mookata_price numeric(12,2) not null default 0,
  extra_bed_price numeric(12,2) not null default 0,
  extra_addons jsonb not null default '[]'::jsonb,
  booking_fee numeric(12,2) not null default 20,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  promptpay_id text,
  qr_code_url text,
  payment_note text,
  property_policy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homestay_settings
  add column if not exists site_name text not null default '',
  add column if not exists logo_url text,
  add column if not exists mookata_price numeric(12,2) not null default 0,
  add column if not exists extra_bed_price numeric(12,2) not null default 0,
  add column if not exists extra_addons jsonb not null default '[]'::jsonb,
  add column if not exists booking_fee numeric(12,2) not null default 20,
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists promptpay_id text,
  add column if not exists qr_code_url text,
  add column if not exists payment_note text,
  add column if not exists property_policy text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_homestay_settings_updated_at on public.homestay_settings;
create trigger set_homestay_settings_updated_at
before update on public.homestay_settings
for each row execute function public.set_updated_at();

create table if not exists public.homestay_plans (
  homestay_id uuid primary key references public.homestays(id) on delete cascade,
  plan_type text not null default 'credit',
  credits integer not null default 0,
  plan_started_at timestamptz,
  plan_expires_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homestay_plans
  add column if not exists plan_type text not null default 'credit',
  add column if not exists credits integer not null default 0,
  add column if not exists plan_started_at timestamptz,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_homestay_plans_updated_at on public.homestay_plans;
create trigger set_homestay_plans_updated_at
before update on public.homestay_plans
for each row execute function public.set_updated_at();

alter table public.homestays enable row level security;
alter table public.homestay_settings enable row level security;
alter table public.homestay_plans enable row level security;

drop policy if exists "dev anon select homestays" on public.homestays;
drop policy if exists "dev anon insert homestays" on public.homestays;
drop policy if exists "dev anon update homestays" on public.homestays;
drop policy if exists "dev anon delete homestays" on public.homestays;

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

drop policy if exists "dev anon select homestay settings" on public.homestay_settings;
drop policy if exists "dev anon upsert homestay settings" on public.homestay_settings;

create policy "dev anon select homestay settings"
on public.homestay_settings for select to anon
using (true);

create policy "dev anon upsert homestay settings"
on public.homestay_settings for all to anon
using (true)
with check (true);

drop policy if exists "dev anon select homestay plans" on public.homestay_plans;
drop policy if exists "dev anon insert homestay plans" on public.homestay_plans;
drop policy if exists "dev anon update homestay plans" on public.homestay_plans;

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
