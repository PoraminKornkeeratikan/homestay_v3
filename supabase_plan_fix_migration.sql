-- Fix homestay_plans so Admin credit reset/topup persists after Owner refresh.
-- Run this in Supabase SQL Editor.

create table if not exists public.homestay_plans (
  homestay_id uuid primary key references public.homestays(id) on delete cascade,
  plan_type text not null default 'credit',
  credits integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homestay_plans
  add column if not exists plan_started_at timestamptz,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.homestay_plans
  alter column plan_type set default 'credit',
  alter column credits set default 0,
  alter column status set default 'active';

update public.homestay_plans
set
  plan_type = coalesce(nullif(plan_type, ''), 'credit'),
  credits = greatest(coalesce(credits, 0), 0),
  status = coalesce(nullif(status, ''), 'active'),
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'homestay_plans_plan_type_check'
      and conrelid = 'public.homestay_plans'::regclass
  ) then
    alter table public.homestay_plans
      add constraint homestay_plans_plan_type_check
      check (plan_type in ('credit', 'yearly', 'infinity'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'homestay_plans_status_check'
      and conrelid = 'public.homestay_plans'::regclass
  ) then
    alter table public.homestay_plans
      add constraint homestay_plans_status_check
      check (status in ('active', 'inactive', 'expired', 'suspended'));
  end if;
end $$;

drop trigger if exists set_homestay_plans_updated_at on public.homestay_plans;
create trigger set_homestay_plans_updated_at
before update on public.homestay_plans
for each row execute function public.set_updated_at();

alter table public.homestay_plans enable row level security;

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

insert into public.homestay_plans (homestay_id, plan_type, credits, status)
select h.id, 'credit', 0, 'active'
from public.homestays h
where not exists (
  select 1
  from public.homestay_plans p
  where p.homestay_id = h.id
);

-- Optional one-time reset for the default homestay.
-- Uncomment and run if you want to immediately clear current credits now.
-- update public.homestay_plans p
-- set plan_type = 'credit',
--     credits = 0,
--     plan_started_at = null,
--     plan_expires_at = null,
--     status = 'active',
--     updated_at = now()
-- from public.homestays h
-- where p.homestay_id = h.id
--   and h.slug = 'Wiwahrin';
