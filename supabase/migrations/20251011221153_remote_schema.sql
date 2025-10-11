alter table "public"."hacks" drop constraint "hacks_unique_author_title";

drop index if exists "public"."hacks_unique_author_title";

alter table "public"."hacks" drop column "author";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.hacks_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if not public.is_admin() then
    if new.slug is distinct from old.slug then
      raise exception 'non-admins cannot change slug';
    end if;
    if new.created_by is distinct from old.created_by then
      raise exception 'non-admins cannot change created_by';
    end if;
    if new.approved is distinct from old.approved then
      raise exception 'non-admins cannot change approved';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    -- If using Supabase auth, service role bypasses RLS anyway, but keep for completeness
    (current_setting('request.jwt.claims', true)::jsonb ? 'role' and
     (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
    or
    (
      -- Check common locations for an admin flag/role
      coalesce((current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,role}'), '') = 'admin'
      or coalesce((current_setting('request.jwt.claims', true)::jsonb #>> '{user_metadata,role}'), '') = 'admin'
      or coalesce((current_setting('request.jwt.claims', true)::jsonb #>> '{claims,role}'), '') = 'admin'
      or coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'admin'), 'false')::boolean = true
    );
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;



