-- Curated hacks are the ones shown on Discover and the homepage. Admins curate from a hack's menu;
-- an approved hack that isn't curated keeps its public page. Read and written with the service role,
-- so anon and authenticated get no SELECT grant on these columns.
alter table public.hacks
  add column curated boolean not null default false,
  add column curated_at timestamptz,
  add column curated_by uuid references auth.users (id) on delete set null,
  add constraint hacks_curated_has_date check (curated = (curated_at is not null));

-- The starting set: every listable hack with an AI label. Their approval date keeps the "New" order
-- as it was. curated_by stays null because no admin made this call. Skip the updated_at trigger so
-- the backfill doesn't stamp every hack with migration day.
alter table public.hacks disable trigger set_hacks_updated_at;
update public.hacks
set curated = true, curated_at = coalesce(approved_at, created_at)
where approved and ai_disclosed_at is not null and not is_archive and deleted_at is null;
alter table public.hacks enable trigger set_hacks_updated_at;

-- Same as 20261006120000_hack_soft_delete.sql, plus the three curation columns.
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
    if new.downloads <> 0 or new.is_archive or new.rejected or new.curated or num_nonnulls(
      new.current_patch, new.original_author, new.permission_from, new.submitted_at,
      new.approved_at, new.approved_by, new.rejected_at, new.rejected_reason, new.rejected_by, new.assigned_admin,
      new.ai_graphics, new.ai_music, new.ai_story, new.ai_translation, new.ai_events, new.ai_code, new.ai_note, new.ai_disclosed_at,
      new.deleted_at, new.deleted_by, new.redirect_url,
      new.curated_at, new.curated_by
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
    new.deleted_at, new.deleted_by, new.redirect_url,
    new.curated, new.curated_at, new.curated_by
  ) is distinct from (
    old.downloads, old.is_archive, old.current_patch, old.original_author, old.permission_from, old.submitted_at,
    old.approved_at, old.approved_by, old.rejected, old.rejected_at, old.rejected_reason, old.rejected_by, old.assigned_admin,
    old.ai_graphics, old.ai_music, old.ai_story, old.ai_translation, old.ai_events, old.ai_code, old.ai_note, old.ai_disclosed_at,
    old.deleted_at, old.deleted_by, old.redirect_url,
    old.curated, old.curated_at, old.curated_by
  ) then
    raise exception 'only Hackdex can change these hack fields';
  end if;
  return new;
end;
$function$;
