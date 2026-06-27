-- Homestay booking SaaS schema for Supabase
-- Run this file in Supabase SQL Editor.
-- Design goal: one core system, many homestays (multi-tenant via homestay_id).

create extension if not exists "pgcrypto";

-- ===== Utility =====
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===== Core tenants =====
create table if not exists public.homestays (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  page_url text,
  gps_url text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_homestays_updated_at
before update on public.homestays
for each row execute function public.set_updated_at();

-- Owner/user profile. auth_user_id links to Supabase Auth later.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique,
  full_name text,
  phone text,
  role text not null default 'owner'
    check (role in ('company_admin', 'owner', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- User membership per homestay.
create table if not exists public.homestay_members (
  id uuid primary key default gen_random_uuid(),
  homestay_id uuid not null references public.homestays(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (homestay_id, profile_id)
);

-- ===== Settings =====
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

create trigger set_homestay_settings_updated_at
before update on public.homestay_settings
for each row execute function public.set_updated_at();

-- ===== Rooms =====
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  homestay_id uuid not null references public.homestays(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  detail text,
  image_url text,
  gallery_images jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  closed_until date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_homestay_id_idx on public.rooms(homestay_id);
create index if not exists rooms_active_idx on public.rooms(active);

create trigger set_rooms_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

-- Optional detailed closures, for future date ranges beyond closed_until.
create table if not exists public.room_closures (
  id uuid primary key default gen_random_uuid(),
  homestay_id uuid not null references public.homestays(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists room_closures_room_dates_idx
on public.room_closures(room_id, start_date, end_date);

-- ===== Bookings =====
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  homestay_id uuid not null references public.homestays(id) on delete cascade,
  booking_code text not null unique,

  guest_name text not null,
  guest_phone text not null,
  guest_email text,

  room_id uuid references public.rooms(id) on delete set null,
  room_name text not null,
  room_price numeric(12,2) not null default 0,

  check_in date not null,
  check_out date not null,
  nights integer not null default 0,
  guest_count integer not null default 1,

  mookata_qty integer not null default 0,
  mookata_price numeric(12,2) not null default 0,
  extra_bed_qty integer not null default 0,
  extra_bed_price numeric(12,2) not null default 0,
  addon_items jsonb not null default '[]'::jsonb,

  room_total numeric(12,2) not null default 0,
  addon_total numeric(12,2) not null default 0,
  booking_fee numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,

  payment_method text,
  payment_status text not null default 'รอชำระเงิน',
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  slip_file_name text,
  slip_mime_type text,
  slip_url text,
  slip_verify_status text not null default 'not_checked'
    check (slip_verify_status in ('not_checked', 'passed', 'failed', 'error')),
  slip_verify_message text,
  slip_verified_at timestamptz,
  slip_transfer_amount numeric(12,2),
  slip_transfer_ref text,
  slip_verify_checks jsonb,
  slip_raw_result jsonb,

  note text,
  status text not null default 'รอชำระเงิน',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in),
  check (nights >= 0),
  check (guest_count > 0)
);

create index if not exists bookings_homestay_id_idx on public.bookings(homestay_id);
create index if not exists bookings_room_id_idx on public.bookings(room_id);
create index if not exists bookings_dates_idx on public.bookings(check_in, check_out);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_payment_status_idx on public.bookings(payment_status);

create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- ===== Credits / subscription =====
create table if not exists public.homestay_plans (
  homestay_id uuid primary key references public.homestays(id) on delete cascade,
  plan_type text not null default 'credit'
    check (plan_type in ('credit', 'yearly', 'infinity')),
  credits integer not null default 0,
  plan_started_at timestamptz,
  plan_expires_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'expired', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_homestay_plans_updated_at
before update on public.homestay_plans
for each row execute function public.set_updated_at();

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  homestay_id uuid not null references public.homestays(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_homestay_id_idx
on public.credit_ledger(homestay_id);

create table if not exists public.topup_requests (
  id uuid primary key default gen_random_uuid(),
  homestay_id uuid not null references public.homestays(id) on delete cascade,
  package_label text not null,
  package_type text not null default 'credit'
    check (package_type in ('credit', 'yearly', 'infinity')),
  credits integer not null default 0,
  amount numeric(12,2) not null default 0,
  slip_file_name text,
  slip_mime_type text,
  slip_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topup_requests_homestay_id_idx
on public.topup_requests(homestay_id);

create trigger set_topup_requests_updated_at
before update on public.topup_requests
for each row execute function public.set_updated_at();

-- ===== Dashboard helper view =====
create or replace view public.homestay_booking_stats as
select
  h.id as homestay_id,
  count(b.id)::integer as total_bookings,
  count(b.id) filter (where b.status = 'รอยืนยัน')::integer as pending_bookings,
  count(b.id) filter (where b.status = 'ยืนยันแล้ว')::integer as confirmed_bookings,
  count(b.id) filter (where b.status = 'ยกเลิก')::integer as cancelled_bookings,
  coalesce(sum(b.grand_total) filter (where b.status <> 'ยกเลิก'), 0)::numeric(12,2) as estimated_revenue
from public.homestays h
left join public.bookings b on b.homestay_id = h.id
group by h.id;

-- ===== Initial sample tenant =====
insert into public.homestays (slug, name, logo_url, status)
values ('Wiwahrin', 'ชื่อที่พัก', '', 'active')
on conflict (slug) do nothing;

insert into public.homestay_settings (
  homestay_id,
  site_name,
  logo_url,
  mookata_price,
  extra_bed_price,
  booking_fee,
  bank_name,
  bank_account_name,
  bank_account_number,
  promptpay_id,
  payment_note,
  property_policy
)
select
  h.id,
  '',
  '',
  0,
  0,
  20,
  '',
  '',
  '',
  '',
  'โอนแล้วส่งสลิปให้แอดมินเพื่อยืนยันการจอง',
  '1. เช็กอินได้ตั้งแต่ 14:00 น.
2. เช็กเอาต์ก่อน 12:00 น.
3. กรุณางดส่งเสียงดังหลัง 22:00 น.
4. หากมีของเสียหาย ผู้เข้าพักต้องรับผิดชอบตามจริง
5. ต้องแสดงเลขรายการจองหรือรูปหลักฐานการจองตอนเข้าพัก'
from public.homestays h
where h.slug = 'Wiwahrin'
on conflict (homestay_id) do nothing;

insert into public.homestay_plans (homestay_id, plan_type, credits, status)
select h.id, 'credit', 0, 'active'
from public.homestays h
where h.slug = 'Wiwahrin'
on conflict (homestay_id) do nothing;

-- ===== RLS preparation =====
-- For the next implementation step we should enable RLS and policies.
-- Do that after frontend authentication is connected, otherwise the current static frontend
-- will not be able to read/write data directly.
