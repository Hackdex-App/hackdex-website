-- The download counter (patch_downloads_inc_hack_downloads / _dec_) updates
-- hacks.downloads on every download, and set_hacks_updated_at stamped
-- updated_at = now() on every update. So updated_at tracked the last download,
-- not the last edit: the creator dashboard sorted by it, the sitemap reported it
-- as lastModified and OpenGraph used it as modifiedTime.
--
-- Give hacks its own trigger function that keeps updated_at when nothing but the
-- download counter changed. The shared set_updated_at() stays as it is for the
-- other tables.
--
-- Columns left out of the comparison:
--   downloads   - the counter itself
--   updated_at  - the column being set
--   search      - generated, and not yet computed in a BEFORE trigger
--
-- Existing updated_at values are not touched here.

create or replace function public.set_hacks_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'downloads' - 'updated_at' - 'search')
     = (to_jsonb(old) - 'downloads' - 'updated_at' - 'search') then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_hacks_updated_at on public.hacks;
create trigger set_hacks_updated_at
before update on public.hacks
for each row
execute function public.set_hacks_updated_at();
