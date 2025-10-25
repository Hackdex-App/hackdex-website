-- Add device_id to patch_downloads and enforce uniqueness per patch/device
alter table if exists public.patch_downloads
  add column if not exists device_id text;

-- Backfill existing rows with a deterministic legacy value
update public.patch_downloads
   set device_id = 'legacy-' || id
 where device_id is null;

-- Enforce NOT NULL after backfill
alter table public.patch_downloads
  alter column device_id set not null;

-- Unique index to dedupe per device per patch
create unique index if not exists patch_downloads_patch_device_id_key
  on public.patch_downloads (patch, device_id);

-- Ensure RLS enabled and allow anonymous inserts
alter table public.patch_downloads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patch_downloads'
      and policyname = 'Allow insert for everyone'
  ) then
    create policy "Allow insert for everyone" on public.patch_downloads
      for insert
      to public
      with check (true);
  end if;
end $$;

-- Trigger functions to keep hacks.downloads in sync
create or replace function public.patch_downloads_inc_hack_downloads()
returns trigger
language plpgsql
as $$
declare
  hack_slug text;
begin
  select p.parent_hack into hack_slug
  from public.patches p
  where p.id = NEW.patch;

  if hack_slug is not null then
    update public.hacks h
       set downloads = h.downloads + 1
     where h.slug = hack_slug;
  end if;

  return NEW;
end;
$$;

create or replace function public.patch_downloads_dec_hack_downloads()
returns trigger
language plpgsql
as $$
declare
  hack_slug text;
begin
  select p.parent_hack into hack_slug
  from public.patches p
  where p.id = OLD.patch;

  if hack_slug is not null then
    update public.hacks h
       set downloads = greatest(h.downloads - 1, 0)
     where h.slug = hack_slug;
  end if;

  return OLD;
end;
$$;

drop trigger if exists patch_downloads_ai on public.patch_downloads;
create trigger patch_downloads_ai
after insert on public.patch_downloads
for each row
execute function public.patch_downloads_inc_hack_downloads();

drop trigger if exists patch_downloads_ad on public.patch_downloads;
create trigger patch_downloads_ad
after delete on public.patch_downloads
for each row
execute function public.patch_downloads_dec_hack_downloads();

-- Backfill hacks.downloads to exact counts
update public.hacks h
   set downloads = coalesce(sub.cnt, 0)
from (
  select h2.slug as slug, count(d.id) as cnt
  from public.hacks h2
  left join public.patches p on p.parent_hack = h2.slug
  left join public.patch_downloads d on d.patch = p.id
  group by h2.slug
) sub
where h.slug = sub.slug;


