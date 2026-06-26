-- Rename the existing starter homestay to Wiwahrin.
-- Run this once in Supabase SQL Editor after the original schema has already been created.

update public.homestays
set
  slug = 'Wiwahrin',
  name = 'Wiwahrin',
  updated_at = now()
where slug <> 'Wiwahrin'
  and id = (
    select id
    from public.homestays
    order by created_at asc
    limit 1
  );

update public.homestay_settings hs
set
  site_name = 'Wiwahrin',
  updated_at = now()
from public.homestays h
where hs.homestay_id = h.id
  and h.slug = 'Wiwahrin';
