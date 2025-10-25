-- Trigger functions to keep hacks.downloads in sync
create or replace function public.patch_downloads_inc_hack_downloads()
returns trigger
language plpgsql
security definer
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
security definer
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
