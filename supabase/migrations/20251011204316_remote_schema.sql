revoke delete on table "public"."hack_covers" from "anon";

revoke insert on table "public"."hack_covers" from "anon";

revoke references on table "public"."hack_covers" from "anon";

revoke select on table "public"."hack_covers" from "anon";

revoke trigger on table "public"."hack_covers" from "anon";

revoke truncate on table "public"."hack_covers" from "anon";

revoke update on table "public"."hack_covers" from "anon";

revoke delete on table "public"."hack_covers" from "authenticated";

revoke insert on table "public"."hack_covers" from "authenticated";

revoke references on table "public"."hack_covers" from "authenticated";

revoke select on table "public"."hack_covers" from "authenticated";

revoke trigger on table "public"."hack_covers" from "authenticated";

revoke truncate on table "public"."hack_covers" from "authenticated";

revoke update on table "public"."hack_covers" from "authenticated";

revoke delete on table "public"."hack_covers" from "service_role";

revoke insert on table "public"."hack_covers" from "service_role";

revoke references on table "public"."hack_covers" from "service_role";

revoke select on table "public"."hack_covers" from "service_role";

revoke trigger on table "public"."hack_covers" from "service_role";

revoke truncate on table "public"."hack_covers" from "service_role";

revoke update on table "public"."hack_covers" from "service_role";

revoke delete on table "public"."hack_tags" from "anon";

revoke insert on table "public"."hack_tags" from "anon";

revoke references on table "public"."hack_tags" from "anon";

revoke select on table "public"."hack_tags" from "anon";

revoke trigger on table "public"."hack_tags" from "anon";

revoke truncate on table "public"."hack_tags" from "anon";

revoke update on table "public"."hack_tags" from "anon";

revoke delete on table "public"."hack_tags" from "authenticated";

revoke insert on table "public"."hack_tags" from "authenticated";

revoke references on table "public"."hack_tags" from "authenticated";

revoke select on table "public"."hack_tags" from "authenticated";

revoke trigger on table "public"."hack_tags" from "authenticated";

revoke truncate on table "public"."hack_tags" from "authenticated";

revoke update on table "public"."hack_tags" from "authenticated";

revoke delete on table "public"."hack_tags" from "service_role";

revoke insert on table "public"."hack_tags" from "service_role";

revoke references on table "public"."hack_tags" from "service_role";

revoke select on table "public"."hack_tags" from "service_role";

revoke trigger on table "public"."hack_tags" from "service_role";

revoke truncate on table "public"."hack_tags" from "service_role";

revoke update on table "public"."hack_tags" from "service_role";

revoke delete on table "public"."hacks" from "anon";

revoke insert on table "public"."hacks" from "anon";

revoke references on table "public"."hacks" from "anon";

revoke select on table "public"."hacks" from "anon";

revoke trigger on table "public"."hacks" from "anon";

revoke truncate on table "public"."hacks" from "anon";

revoke update on table "public"."hacks" from "anon";

revoke delete on table "public"."hacks" from "authenticated";

revoke insert on table "public"."hacks" from "authenticated";

revoke references on table "public"."hacks" from "authenticated";

revoke select on table "public"."hacks" from "authenticated";

revoke trigger on table "public"."hacks" from "authenticated";

revoke truncate on table "public"."hacks" from "authenticated";

revoke update on table "public"."hacks" from "authenticated";

revoke delete on table "public"."hacks" from "service_role";

revoke insert on table "public"."hacks" from "service_role";

revoke references on table "public"."hacks" from "service_role";

revoke select on table "public"."hacks" from "service_role";

revoke trigger on table "public"."hacks" from "service_role";

revoke truncate on table "public"."hacks" from "service_role";

revoke update on table "public"."hacks" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."tags" from "anon";

revoke insert on table "public"."tags" from "anon";

revoke references on table "public"."tags" from "anon";

revoke select on table "public"."tags" from "anon";

revoke trigger on table "public"."tags" from "anon";

revoke truncate on table "public"."tags" from "anon";

revoke update on table "public"."tags" from "anon";

revoke delete on table "public"."tags" from "authenticated";

revoke insert on table "public"."tags" from "authenticated";

revoke references on table "public"."tags" from "authenticated";

revoke select on table "public"."tags" from "authenticated";

revoke trigger on table "public"."tags" from "authenticated";

revoke truncate on table "public"."tags" from "authenticated";

revoke update on table "public"."tags" from "authenticated";

revoke delete on table "public"."tags" from "service_role";

revoke insert on table "public"."tags" from "service_role";

revoke references on table "public"."tags" from "service_role";

revoke select on table "public"."tags" from "service_role";

revoke trigger on table "public"."tags" from "service_role";

revoke truncate on table "public"."tags" from "service_role";

revoke update on table "public"."tags" from "service_role";

create table "public"."invite_codes" (
    "created_at" timestamp with time zone not null default now(),
    "code" text not null,
    "used_by" uuid
);


alter table "public"."invite_codes" enable row level security;

create table "public"."patch_downloads" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "patch" bigint
);


alter table "public"."patch_downloads" enable row level security;

create table "public"."patches" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "version" text not null,
    "filename" text not null,
    "bucket" text not null,
    "parent_hack" text
);


alter table "public"."patches" enable row level security;

alter table "public"."hacks" add column "approved_at" timestamp without time zone;

alter table "public"."hacks" add column "approved_by" uuid;

alter table "public"."hacks" add column "current_patch" bigint;

alter table "public"."hacks" add column "estimated_release" date;

alter table "public"."hacks" add column "language" text not null;

CREATE UNIQUE INDEX invite_codes_code_key ON public.invite_codes USING btree (code);

CREATE UNIQUE INDEX invite_codes_pkey ON public.invite_codes USING btree (code);

CREATE UNIQUE INDEX patch_downloads_pkey ON public.patch_downloads USING btree (id);

CREATE UNIQUE INDEX patches_pkey ON public.patches USING btree (id);

alter table "public"."invite_codes" add constraint "invite_codes_pkey" PRIMARY KEY using index "invite_codes_pkey";

alter table "public"."patch_downloads" add constraint "patch_downloads_pkey" PRIMARY KEY using index "patch_downloads_pkey";

alter table "public"."patches" add constraint "patches_pkey" PRIMARY KEY using index "patches_pkey";

alter table "public"."hacks" add constraint "hacks_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."hacks" validate constraint "hacks_approved_by_fkey";

alter table "public"."hacks" add constraint "hacks_current_patch_fkey" FOREIGN KEY (current_patch) REFERENCES patches(id) ON DELETE SET NULL not valid;

alter table "public"."hacks" validate constraint "hacks_current_patch_fkey";

alter table "public"."invite_codes" add constraint "invite_codes_code_key" UNIQUE using index "invite_codes_code_key";

alter table "public"."invite_codes" add constraint "invite_codes_used_by_fkey" FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."invite_codes" validate constraint "invite_codes_used_by_fkey";

alter table "public"."patch_downloads" add constraint "patch_downloads_patch_fkey" FOREIGN KEY (patch) REFERENCES patches(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."patch_downloads" validate constraint "patch_downloads_patch_fkey";

alter table "public"."patches" add constraint "patches_parent_hack_fkey" FOREIGN KEY (parent_hack) REFERENCES hacks(slug) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."patches" validate constraint "patches_parent_hack_fkey";

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

create policy "Enable insert for admin users only"
on "public"."invite_codes"
as permissive
for insert
to supabase_admin
with check (true);


create policy "Allow supabase_admins to select"
on "public"."patch_downloads"
as permissive
for select
to supabase_admin
using (true);


create policy "Enable delete for users based on user_id"
on "public"."patch_downloads"
as permissive
for delete
to supabase_admin
using (true);


create policy "Enable read access for all users"
on "public"."patches"
as permissive
for select
to public
using (true);


create policy "Only allow authenticated users to create patches for hacks that"
on "public"."patches"
as permissive
for insert
to public
with check ((( SELECT auth.uid() AS uid) IN ( SELECT hack.created_by
   FROM hacks hack
  WHERE (hack.slug = patches.parent_hack))));



drop policy "Anyone can upload an avatar." on "storage"."objects";

drop policy "Authenticated users can upload hack boxart." on "storage"."objects";

drop policy "Authenticated users can upload hack covers." on "storage"."objects";


  create policy "Anyone can upload an avatar."
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'avatars'::text));



  create policy "Authenticated users can upload hack boxart."
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'hack-boxart'::text));



  create policy "Authenticated users can upload hack covers."
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'hack-covers'::text));



