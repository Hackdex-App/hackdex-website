-- v2 redesign: private drafts, the AI label, server-only hack fields, and patch visibility.

-- Drafts --------------------------------------------------------------------

-- A hack starts as a private draft and becomes visible to reviewers once the
-- creator submits it. null = draft (creator only); set = in the review queue.
alter table if exists public.hacks
  add column if not exists submitted_at timestamp with time zone;

-- Everything that exists today was submitted the moment it was created.
-- Skip the updated_at trigger so the backfill doesn't stamp every hack with
-- migration day (dashboards sort by it, and it feeds OpenGraph modifiedTime).
alter table public.hacks disable trigger set_hacks_updated_at;
update public.hacks set submitted_at = created_at where submitted_at is null;
alter table public.hacks enable trigger set_hacks_updated_at;

-- AI label ------------------------------------------------------------------

-- Creator-reported AI use, one level per area (Terms 1.1.0, Section 6).
-- All six are null until the creator fills in the form; after that all six are set.
create type public.ai_level as enum ('none', 'little', 'some', 'most', 'all');

alter table public.hacks
  add column ai_graphics public.ai_level,
  add column ai_music public.ai_level,
  add column ai_story public.ai_level,
  add column ai_translation public.ai_level,
  add column ai_events public.ai_level,
  add column ai_code public.ai_level,
  -- Optional explanation shown to players under the breakdown.
  add column ai_note text,
  -- When the creator last filled in or confirmed the form.
  add column ai_disclosed_at timestamp with time zone;

alter table public.hacks
  add constraint hacks_ai_all_or_none check (
    num_nulls(ai_graphics, ai_music, ai_story, ai_translation, ai_events, ai_code) in (0, 6)
    and (ai_code is null) = (ai_disclosed_at is null)
  ),
  -- Content areas only use None / Some / Most; the finer scale is for code.
  add constraint hacks_ai_content_levels check (
    coalesce(ai_graphics, 'none') in ('none', 'some', 'most')
    and coalesce(ai_music, 'none') in ('none', 'some', 'most')
    and coalesce(ai_story, 'none') in ('none', 'some', 'most')
    and coalesce(ai_translation, 'none') in ('none', 'some', 'most')
    and coalesce(ai_events, 'none') in ('none', 'some', 'most')
  ),
  add constraint hacks_ai_note_length check (char_length(ai_note) <= 1000);

-- Server-only hack fields ---------------------------------------------------

-- Hack fields that only the server may write. The owner update policy has no column list and the
-- insert policy only checks created_by and approved, so a creator could call PostgREST directly to
-- mark a draft submitted (skipping its checklist), credit someone else as the author, set
-- downloads, or point current_patch anywhere. The app now writes these with the service role after
-- its own checks; admins, the service role, and postgres (triggers, migrations) pass through.
create or replace function public.hacks_update_guard()
returns trigger
language plpgsql
as $function$
begin
  if current_user in ('postgres', 'dashboard_user', 'service_role') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.downloads <> 0 or new.is_archive or new.rejected or num_nonnulls(
      new.current_patch, new.original_author, new.permission_from, new.submitted_at,
      new.approved_at, new.approved_by, new.rejected_at, new.rejected_reason, new.rejected_by, new.assigned_admin,
      new.ai_graphics, new.ai_music, new.ai_story, new.ai_translation, new.ai_events, new.ai_code, new.ai_note, new.ai_disclosed_at
    ) > 0 then
      raise exception 'only Hackdex can set these hack fields';
    end if;
    return new;
  end if;

  if new.slug is distinct from old.slug then
    raise exception 'non-admins cannot change slug';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'non-admins cannot change created_by';
  end if;
  if new.approved is distinct from old.approved then
    raise exception 'non-admins cannot change approved';
  end if;
  if (
    new.downloads, new.is_archive, new.current_patch, new.original_author, new.permission_from, new.submitted_at,
    new.approved_at, new.approved_by, new.rejected, new.rejected_at, new.rejected_reason, new.rejected_by, new.assigned_admin,
    new.ai_graphics, new.ai_music, new.ai_story, new.ai_translation, new.ai_events, new.ai_code, new.ai_note, new.ai_disclosed_at
  ) is distinct from (
    old.downloads, old.is_archive, old.current_patch, old.original_author, old.permission_from, old.submitted_at,
    old.approved_at, old.approved_by, old.rejected, old.rejected_at, old.rejected_reason, old.rejected_by, old.assigned_admin,
    old.ai_graphics, old.ai_music, old.ai_story, old.ai_translation, old.ai_events, old.ai_code, old.ai_note, old.ai_disclosed_at
  ) then
    raise exception 'only Hackdex can change these hack fields';
  end if;
  return new;
end;
$function$;

drop trigger if exists hacks_insert_guard on public.hacks;
create trigger hacks_insert_guard
  before insert on public.hacks
  for each row execute function public.hacks_update_guard();

-- Patches -------------------------------------------------------------------

-- One row per version per hack. The app checks before inserting, but two
-- uploads finishing together could both pass that check.
-- If this fails on existing data, find the duplicates with:
--   select parent_hack, version, count(*) from public.patches group by 1, 2 having count(*) > 1;
create unique index if not exists patches_parent_hack_version_key on public.patches (parent_hack, version);

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
