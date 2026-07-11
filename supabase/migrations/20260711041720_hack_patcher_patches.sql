create table if not exists public.hack_patcher_patches (
  hack_slug   text not null references public.hacks(slug) on update cascade on delete cascade,
  patch_id    bigint not null references public.patches(id) on update cascade on delete cascade,
  sort_order  integer not null,
  created_at  timestamptz not null default now(),
  primary key (hack_slug, patch_id)
);

create index hack_patcher_patches_hack_slug_idx
  on public.hack_patcher_patches (hack_slug);

create index hack_patcher_patches_patch_id_idx
  on public.hack_patcher_patches (patch_id);

alter table public.hack_patcher_patches enable row level security;

-- Public read (same as patch_groups)
create policy "Patcher patches are viewable by everyone"
  on public.hack_patcher_patches for select using (true);

-- Insert / update / delete: creator, admin, archiver.
create policy "Users can insert patcher patches for own hacks"
  on public.hack_patcher_patches for insert
  with check (
    (public.is_admin() OR
      (public.is_archiver() AND public.is_archive_hack_for_archiver(hack_slug)) OR
      exists (
        select 1 from public.hacks h
        where h.slug = hack_patcher_patches.hack_slug and h.created_by = auth.uid()
      ))
    AND exists (
      select 1 from public.patches p
      where p.id = hack_patcher_patches.patch_id
        and p.parent_hack = hack_patcher_patches.hack_slug
    )
  );

create policy "Users can update patcher patches for own hacks"
  on public.hack_patcher_patches for update
  using (
    public.is_admin() OR
    (public.is_archiver() AND public.is_archive_hack_for_archiver(hack_slug)) OR
    exists (
      select 1 from public.hacks h
      where h.slug = hack_patcher_patches.hack_slug and h.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin() OR
    (public.is_archiver() AND public.is_archive_hack_for_archiver(hack_slug)) OR
    exists (
      select 1 from public.hacks h
      where h.slug = hack_patcher_patches.hack_slug and h.created_by = auth.uid()
    )
  );

create policy "Users can delete patcher patches for own hacks"
  on public.hack_patcher_patches for delete
  using (
    public.is_admin() OR
    (public.is_archiver() AND public.is_archive_hack_for_archiver(hack_slug)) OR
    exists (
      select 1 from public.hacks h
      where h.slug = hack_patcher_patches.hack_slug and h.created_by = auth.uid()
    )
  );
