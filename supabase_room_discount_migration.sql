alter table public.rooms
  add column if not exists discount_price numeric(12,2) not null default 0;
