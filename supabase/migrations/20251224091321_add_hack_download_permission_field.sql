create type public."Patches Download Permission" as enum ('None', 'Current', 'All');

alter table if exists public.hacks
  add column if not exists patches_download_permission "Patches Download Permission" not null default 'None';
