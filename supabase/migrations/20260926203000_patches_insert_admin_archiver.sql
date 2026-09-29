-- Allow admins and archive editors to insert patches, matching app-level
-- checkPatchEditPermission. The original policy only allowed created_by.

drop policy if exists "Only allow authenticated users to create patches for hacks that"
  on public.patches;

create policy "Users can insert patches for own hacks"
  on public.patches
  for insert
  with check (
    public.is_admin() OR
    (public.is_archiver() AND public.is_archive_hack_for_archiver(parent_hack)) OR
    exists (
      select 1 from public.hacks h
      where h.slug = patches.parent_hack and h.created_by = auth.uid()
    )
  );
