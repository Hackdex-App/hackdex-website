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
