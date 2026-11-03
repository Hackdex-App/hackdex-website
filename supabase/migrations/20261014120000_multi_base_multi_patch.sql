-- Multiple source ROMs per hack, plus per-patch variant metadata.

-- Base ROMs ------------------------------------------------------------------

-- Every base ROM a hack can be applied to, in display order. hacks.base_rom
-- stays the first one so everything that reads a single ROM keeps working.
create table if not exists public.hack_base_roms (
  hack_slug   text not null references public.hacks(slug) on update cascade on delete cascade,
  base_rom    text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (hack_slug, base_rom)
);

create index if not exists hack_base_roms_base_rom_idx
  on public.hack_base_roms (base_rom);

alter table public.hack_base_roms enable row level security;

-- Readable wherever the hack is. The subquery runs under the hacks policies, so
-- drafts, pending and deleted hacks stay hidden the same way covers and tags do.
create policy "Hack base ROMs follow their hack."
  on public.hack_base_roms for select to anon, authenticated
  using (exists (select 1 from public.hacks h where h.slug = hack_base_roms.hack_slug));

-- Only the server writes these, after its own permission and lock checks (the
-- base ROMs lock once a patch is uploaded), so there are no write policies.
grant select on table public.hack_base_roms to anon, authenticated;
grant select, insert, update, delete on table public.hack_base_roms to service_role;

insert into public.hack_base_roms (hack_slug, base_rom, sort_order)
select slug, base_rom, 0
from public.hacks
where base_rom is not null and length(btrim(base_rom)) > 0
on conflict do nothing;

-- Patch variants -------------------------------------------------------------

-- A version can hold several named patches (e.g. one per base ROM). label names
-- the patch for players, info explains it, and base_rom is the ROM it applies to.
alter table public.patches
  add column if not exists label text,
  add column if not exists info text,
  add column if not exists base_rom text;

alter table public.patches
  add constraint patches_label_length check (label is null or char_length(label) <= 48),
  add constraint patches_info_length check (info is null or char_length(info) <= 500);

-- One row per version and patch name, replacing one row per version. Unnamed
-- patches keep the old rule: coalesce makes a second unnamed one collide.
drop index if exists public.patches_parent_hack_version_key;
create unique index if not exists patches_parent_hack_version_label_key
  on public.patches (parent_hack, version, coalesce(label, ''));
