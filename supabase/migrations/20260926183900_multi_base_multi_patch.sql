-- Multiple source ROMs per hack, plus per-patch variant metadata.

create table if not exists public.hack_base_roms (
  hack_slug   text not null references public.hacks(slug) on update cascade on delete cascade,
  base_rom    text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (hack_slug, base_rom)
);

create index hack_base_roms_hack_slug_idx
  on public.hack_base_roms (hack_slug);

create index hack_base_roms_base_rom_idx
  on public.hack_base_roms (base_rom);

alter table public.hack_base_roms enable row level security;

create policy "Hack base ROMs are viewable by everyone"
  on public.hack_base_roms for select using (true);

create policy "Users can insert base ROMs for own hacks"
  on public.hack_base_roms for insert
  with check (
    public.is_admin() OR
    (public.is_archiver() AND public.is_archive_hack_for_archiver(hack_slug)) OR
    exists (
      select 1 from public.hacks h
      where h.slug = hack_base_roms.hack_slug and h.created_by = auth.uid()
    )
  );

create policy "Users can update base ROMs for own hacks"
  on public.hack_base_roms for update
  using (
    public.is_admin() OR
    (public.is_archiver() AND public.is_archive_hack_for_archiver(hack_slug)) OR
    exists (
      select 1 from public.hacks h
      where h.slug = hack_base_roms.hack_slug and h.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin() OR
    (public.is_archiver() AND public.is_archive_hack_for_archiver(hack_slug)) OR
    exists (
      select 1 from public.hacks h
      where h.slug = hack_base_roms.hack_slug and h.created_by = auth.uid()
    )
  );

create policy "Users can delete base ROMs for own hacks"
  on public.hack_base_roms for delete
  using (
    public.is_admin() OR
    (public.is_archiver() AND public.is_archive_hack_for_archiver(hack_slug)) OR
    exists (
      select 1 from public.hacks h
      where h.slug = hack_base_roms.hack_slug and h.created_by = auth.uid()
    )
  );

grant select, insert, update, delete on table public.hack_base_roms to authenticated;
grant select, insert, update, delete on table public.hack_base_roms to service_role;
grant select on table public.hack_base_roms to anon;

insert into public.hack_base_roms (hack_slug, base_rom, sort_order)
select slug, base_rom, 0
from public.hacks
where base_rom is not null and length(btrim(base_rom)) > 0
on conflict do nothing;

alter table public.patches
  add column if not exists label text,
  add column if not exists info text,
  add column if not exists base_rom text;

alter table public.patches
  add constraint patches_label_length check (label is null or char_length(label) <= 48);

alter table public.patches
  add constraint patches_info_length check (info is null or char_length(info) <= 500);

create unique index if not exists patches_parent_hack_version_label_key
  on public.patches (parent_hack, version, coalesce(label, ''));
