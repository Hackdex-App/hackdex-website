alter table if exists public.hacks
  add column if not exists custom_version_name text;
