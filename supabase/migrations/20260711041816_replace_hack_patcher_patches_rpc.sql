create or replace function public.replace_hack_patcher_patches(
  p_hack_slug text,
  p_patch_ids bigint[],
  p_custom_version_name text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Empty list = switch to Latest mode
  if coalesce(cardinality(p_patch_ids), 0) = 0 then
    delete from public.hack_patcher_patches where hack_slug = p_hack_slug;
    update public.hacks set custom_version_name = null where slug = p_hack_slug;
    return;
  end if;

  if p_custom_version_name is null or length(btrim(p_custom_version_name)) = 0 then
    raise exception 'Custom version name is required';
  end if;
  if length(btrim(p_custom_version_name)) > 12 then
    raise exception 'Custom version name must 12 characters or less';
  end if;

  -- All IDs must belong to the same hack
  select count(*) into v_count
  from public.patches p
  where p.id = any(p_patch_ids)
    and p.parent_hack = p_hack_slug
    and p.archived = false;

  if v_count <> cardinality(p_patch_ids) then
    raise exception 'One or more patches either do not belong to this hack or are archived';
  end if;

  delete from public.hack_patcher_patches where hack_slug = p_hack_slug;
  insert into public.hack_patcher_patches (hack_slug, patch_id, sort_order)
  select
    p_hack_slug,
    patch_id,
    ordinality::integer
  from unnest(p_patch_ids) with ordinality as t(patch_id, ordinality);
  update public.hacks
  set custom_version_name = btrim(p_custom_version_name)
  where slug = p_hack_slug;
end;
$$;

revoke all on function public.replace_hack_patcher_patches(text, bigint[], text) from public;
grant execute on function public.replace_hack_patcher_patches(text, bigint[], text) to authenticated;
grant execute on function public.replace_hack_patcher_patches(text, bigint[], text) to service_role;
