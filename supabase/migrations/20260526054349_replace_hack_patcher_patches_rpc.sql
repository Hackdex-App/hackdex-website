create or replace function public.replace_hack_patcher_patches(
  p_hack_slug text,
  p_patch_ids bigint[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.hack_patcher_patches
  where hack_slug = p_hack_slug;

  insert into public.hack_patcher_patches (hack_slug, patch_id, sort_order)
  select
    p_hack_slug,
    patch_id,
    ordinality::integer
  from unnest(p_patch_ids) with ordinality as t(patch_id, ordinality);
end;
$$;
