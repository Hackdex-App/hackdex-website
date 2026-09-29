-- Patch rows were readable by anyone, which exposed drafts' and pending hacks'
-- file names. Reads now follow the same rules as hack_covers and hack_tags.
drop policy if exists "Enable read access for all users" on public.patches;

create policy "Public can view patches for approved hacks."
on public.patches for select to public
using (exists (
  select 1 from public.hacks h
  where h.slug = patches.parent_hack
    and (h.approved = true or h.created_by = auth.uid() or public.is_admin())
));

create policy "Archivers can view patches for archive hacks."
on public.patches for select to public
using (public.is_archiver() and public.is_archive_hack_for_archiver(parent_hack));

-- Only the server creates patch rows, after checking the upload belongs to the
-- hack. A direct insert could point a row at another hack's file.
drop policy if exists "Only allow authenticated users to create patches for hacks that" on public.patches;
