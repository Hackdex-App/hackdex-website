alter table if exists public.hacks
  add column if not exists verification_contact_info text;
