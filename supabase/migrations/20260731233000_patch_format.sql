create type public."Patch Format" as enum ('bps', 'xdelta');

alter table if exists public.patches
  add column if not exists format "Patch Format" not null default 'bps';
