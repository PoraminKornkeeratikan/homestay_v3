-- EasySlip verification columns for existing Supabase projects.
-- Run this once in Supabase SQL Editor before using automatic slip verification.

alter table public.bookings
add column if not exists slip_verify_status text not null default 'not_checked',
add column if not exists slip_verify_message text,
add column if not exists slip_verified_at timestamptz,
add column if not exists slip_transfer_amount numeric(12,2),
add column if not exists slip_transfer_ref text,
add column if not exists slip_verify_checks jsonb,
add column if not exists slip_raw_result jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_slip_verify_status_check'
  ) then
    alter table public.bookings
    add constraint bookings_slip_verify_status_check
    check (slip_verify_status in ('not_checked', 'passed', 'failed', 'error'));
  end if;
end $$;