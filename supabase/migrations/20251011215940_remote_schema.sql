revoke delete on table "public"."invite_codes" from "anon";

revoke insert on table "public"."invite_codes" from "anon";

revoke references on table "public"."invite_codes" from "anon";

revoke select on table "public"."invite_codes" from "anon";

revoke trigger on table "public"."invite_codes" from "anon";

revoke truncate on table "public"."invite_codes" from "anon";

revoke update on table "public"."invite_codes" from "anon";

revoke delete on table "public"."invite_codes" from "authenticated";

revoke insert on table "public"."invite_codes" from "authenticated";

revoke references on table "public"."invite_codes" from "authenticated";

revoke select on table "public"."invite_codes" from "authenticated";

revoke trigger on table "public"."invite_codes" from "authenticated";

revoke truncate on table "public"."invite_codes" from "authenticated";

revoke update on table "public"."invite_codes" from "authenticated";

revoke delete on table "public"."invite_codes" from "service_role";

revoke insert on table "public"."invite_codes" from "service_role";

revoke references on table "public"."invite_codes" from "service_role";

revoke select on table "public"."invite_codes" from "service_role";

revoke trigger on table "public"."invite_codes" from "service_role";

revoke truncate on table "public"."invite_codes" from "service_role";

revoke update on table "public"."invite_codes" from "service_role";

revoke delete on table "public"."patch_downloads" from "anon";

revoke insert on table "public"."patch_downloads" from "anon";

revoke references on table "public"."patch_downloads" from "anon";

revoke select on table "public"."patch_downloads" from "anon";

revoke trigger on table "public"."patch_downloads" from "anon";

revoke truncate on table "public"."patch_downloads" from "anon";

revoke update on table "public"."patch_downloads" from "anon";

revoke delete on table "public"."patch_downloads" from "authenticated";

revoke insert on table "public"."patch_downloads" from "authenticated";

revoke references on table "public"."patch_downloads" from "authenticated";

revoke select on table "public"."patch_downloads" from "authenticated";

revoke trigger on table "public"."patch_downloads" from "authenticated";

revoke truncate on table "public"."patch_downloads" from "authenticated";

revoke update on table "public"."patch_downloads" from "authenticated";

revoke delete on table "public"."patch_downloads" from "service_role";

revoke insert on table "public"."patch_downloads" from "service_role";

revoke references on table "public"."patch_downloads" from "service_role";

revoke select on table "public"."patch_downloads" from "service_role";

revoke trigger on table "public"."patch_downloads" from "service_role";

revoke truncate on table "public"."patch_downloads" from "service_role";

revoke update on table "public"."patch_downloads" from "service_role";

revoke delete on table "public"."patches" from "anon";

revoke insert on table "public"."patches" from "anon";

revoke references on table "public"."patches" from "anon";

revoke select on table "public"."patches" from "anon";

revoke trigger on table "public"."patches" from "anon";

revoke truncate on table "public"."patches" from "anon";

revoke update on table "public"."patches" from "anon";

revoke delete on table "public"."patches" from "authenticated";

revoke insert on table "public"."patches" from "authenticated";

revoke references on table "public"."patches" from "authenticated";

revoke select on table "public"."patches" from "authenticated";

revoke trigger on table "public"."patches" from "authenticated";

revoke truncate on table "public"."patches" from "authenticated";

revoke update on table "public"."patches" from "authenticated";

revoke delete on table "public"."patches" from "service_role";

revoke insert on table "public"."patches" from "service_role";

revoke references on table "public"."patches" from "service_role";

revoke select on table "public"."patches" from "service_role";

revoke trigger on table "public"."patches" from "service_role";

revoke truncate on table "public"."patches" from "service_role";

revoke update on table "public"."patches" from "service_role";

drop index if exists "public"."hacks_tags_gin_idx";

alter table "public"."hacks" drop column "covers";

alter table "public"."hacks" drop column "tags";

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



