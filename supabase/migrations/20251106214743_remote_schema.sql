create table "public"."hack_team" (
    "created_at" timestamp with time zone not null default now(),
    "userid" uuid,
    "name" text,
    "hack_slug" text not null
);


alter table "public"."hack_team" enable row level security;

alter table "public"."hacks" add column "original_author" text;

CREATE UNIQUE INDEX hack_team_pkey ON public.hack_team USING btree (hack_slug);

alter table "public"."hack_team" add constraint "hack_team_pkey" PRIMARY KEY using index "hack_team_pkey";

alter table "public"."hack_team" add constraint "hack_team_hack_slug_fkey" FOREIGN KEY (hack_slug) REFERENCES hacks(slug) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."hack_team" validate constraint "hack_team_hack_slug_fkey";

alter table "public"."hack_team" add constraint "hack_team_userid_fkey" FOREIGN KEY (userid) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."hack_team" validate constraint "hack_team_userid_fkey";

alter table "public"."hack_team" add constraint "only_one_user_column_defined" CHECK ((((userid IS NOT NULL) AND (name IS NULL)) OR ((userid IS NULL) AND (name IS NOT NULL)))) not valid;

alter table "public"."hack_team" validate constraint "only_one_user_column_defined";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_claim(uid uuid, claim text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN 'error: access denied';
      ELSE        
        update auth.users set raw_app_meta_data = 
          raw_app_meta_data - claim where id = uid;
        return 'OK';
      END IF;
    END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_claim(uid uuid, claim text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    DECLARE retval jsonb;
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN '{"error":"access denied"}'::jsonb;
      ELSE
        select coalesce(raw_app_meta_data->claim, null) from auth.users into retval where id = uid::uuid;
        return retval;
      END IF;
    END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_claims(uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    DECLARE retval jsonb;
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN '{"error":"access denied"}'::jsonb;
      ELSE
        select raw_app_meta_data from auth.users into retval where id = uid::uuid;
        return retval;
      END IF;
    END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_claim(claim text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
  	coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' -> claim, null)
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_claims()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
  	coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata', '{}'::jsonb)::jsonb
$function$
;

CREATE OR REPLACE FUNCTION public.hacks_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$begin
  if current_user in ('postgres', 'dashboard_user') then
    return new;
  end if;

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
end;$function$
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
  	coalesce(get_my_claim('claims_admin')::bool,false)
$function$
;

CREATE OR REPLACE FUNCTION public.is_claims_admin()
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
  BEGIN
    IF session_user = 'authenticator' THEN
      --------------------------------------------
      -- To disallow any authenticated app users
      -- from editing claims, delete the following
      -- block of code and replace it with:
      -- RETURN FALSE;
      --------------------------------------------
      IF extract(epoch from now()) > coalesce((current_setting('request.jwt.claims', true)::jsonb)->>'exp', '0')::numeric THEN
        return false; -- jwt expired
      END IF;
      If current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
        RETURN true; -- service role users have admin rights
      END IF;
      IF coalesce((current_setting('request.jwt.claims', true)::jsonb)->'app_metadata'->'claims_admin', 'false')::bool THEN
        return true; -- user has claims_admin set to true
      ELSE
        return false; -- user does NOT have claims_admin set to true
      END IF;
      --------------------------------------------
      -- End of block 
      --------------------------------------------
    ELSE -- not a user session, probably being called from a trigger or something
      return true;
    END IF;
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.patch_downloads_dec_hack_downloads()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  hack_slug text;
begin
  select p.parent_hack into hack_slug
  from public.patches p
  where p.id = OLD.patch;

  if hack_slug is not null then
    update public.hacks h
       set downloads = greatest(h.downloads - 1, 0)
     where h.slug = hack_slug;
  end if;

  return OLD;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.patch_downloads_inc_hack_downloads()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  hack_slug text;
begin
  select p.parent_hack into hack_slug
  from public.patches p
  where p.id = NEW.patch;

  if hack_slug is not null then
    update public.hacks h
       set downloads = h.downloads + 1
     where h.slug = hack_slug;
  end if;

  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_claim(uid uuid, claim text, value jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    BEGIN
      IF NOT is_claims_admin() THEN
          RETURN 'error: access denied';
      ELSE        
        update auth.users set raw_app_meta_data = 
          raw_app_meta_data || 
            json_build_object(claim, value)::jsonb where id = uid;
        return 'OK';
      END IF;
    END;
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

create policy "Team members can update hacks."
on "public"."hacks"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM hack_team
  WHERE ((hack_team.hack_slug = hacks.slug) AND (hack_team.userid = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM hack_team
  WHERE ((hack_team.hack_slug = hacks.slug) AND (hack_team.userid = auth.uid())))));




