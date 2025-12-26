alter table if exists public.profiles
  add column if not exists verified boolean not null default false;
