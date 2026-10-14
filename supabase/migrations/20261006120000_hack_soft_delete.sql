-- Soft delete for hacks. An admin deletes a hack from its page; the row and its files stay, but the
-- hack is gone everywhere: its URL 404s for everyone (admins included), or permanently redirects to
-- redirect_url when one is set.
--
-- There's no UI to restore one. To bring a hack back:
--   update public.hacks set deleted_at = null, deleted_by = null, redirect_url = null where slug = '<slug>';
-- then clear the caches: GET /api/refresh/<slug> and /api/discover/refresh (both as an admin).
alter table public.hacks
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users (id) on delete set null,
  -- Absolute http(s) URL or site path. Only used once deleted_at is set.
  add column redirect_url text;

-- Deleted hacks don't exist for API callers, admins included. Child tables whose policies look the
-- hack up (covers, tags, patches) follow along. The app deletes and reads deleted rows with the
-- service role, and restores happen in the SQL editor, so neither needs a way through.
create policy "Deleted hacks are hidden from everyone."
on public.hacks as restrictive for all to anon, authenticated
using (deleted_at is null)
with check (deleted_at is null);

-- These two are readable by anyone and never look the hack up, so they'd still list a deleted hack's
-- patch ids. The subquery runs under the hacks policies, so rows follow their hack's visibility.
create policy "Patch groups follow their hack."
on public.patch_groups as restrictive for select to anon, authenticated
using (exists (select 1 from public.hacks h where h.slug = patch_groups.hack_slug));

create policy "Patcher patches follow their hack."
on public.hack_patcher_patches as restrictive for select to anon, authenticated
using (exists (select 1 from public.hacks h where h.slug = hack_patcher_patches.hack_slug));

-- SECURITY DEFINER skips the hacks policy, so it has to check on its own.
create or replace function public.is_archive_hack_for_archiver(hack_slug text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.hacks h
    where h.slug = hack_slug
      and h.is_archive = true
      and h.deleted_at is null
  );
$$;

-- Same as 20261003034744_v2_redesign.sql, plus the three delete columns.
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
      new.ai_graphics, new.ai_music, new.ai_story, new.ai_translation, new.ai_events, new.ai_code, new.ai_note, new.ai_disclosed_at,
      new.deleted_at, new.deleted_by, new.redirect_url
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
    new.ai_graphics, new.ai_music, new.ai_story, new.ai_translation, new.ai_events, new.ai_code, new.ai_note, new.ai_disclosed_at,
    new.deleted_at, new.deleted_by, new.redirect_url
  ) is distinct from (
    old.downloads, old.is_archive, old.current_patch, old.original_author, old.permission_from, old.submitted_at,
    old.approved_at, old.approved_by, old.rejected, old.rejected_at, old.rejected_reason, old.rejected_by, old.assigned_admin,
    old.ai_graphics, old.ai_music, old.ai_story, old.ai_translation, old.ai_events, old.ai_code, old.ai_note, old.ai_disclosed_at,
    old.deleted_at, old.deleted_by, old.redirect_url
  ) then
    raise exception 'only Hackdex can change these hack fields';
  end if;
  return new;
end;
$function$;
