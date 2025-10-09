


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."hacks_update_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."hacks_update_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."hack_covers" (
    "id" bigint NOT NULL,
    "hack_slug" "text" NOT NULL,
    "url" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "alt" "text"
);


ALTER TABLE "public"."hack_covers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."hack_covers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."hack_covers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."hack_covers_id_seq" OWNED BY "public"."hack_covers"."id";



CREATE TABLE IF NOT EXISTS "public"."hack_tags" (
    "hack_slug" "text" NOT NULL,
    "tag_id" bigint NOT NULL
);


ALTER TABLE "public"."hack_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hacks" (
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "author" "text" NOT NULL,
    "covers" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "summary" "text" NOT NULL,
    "description" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "downloads" integer DEFAULT 0 NOT NULL,
    "base_rom" "text" NOT NULL,
    "patch_url" "text" NOT NULL,
    "version" "text" NOT NULL,
    "approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "social_links" "jsonb",
    "box_art" "text",
    "created_by" "uuid" NOT NULL,
    "search" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"simple"'::"regconfig", ((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("summary", ''::"text")) || ' '::"text") || COALESCE("description", ''::"text")))) STORED,
    CONSTRAINT "downloads_nonneg" CHECK (("downloads" >= 0)),
    CONSTRAINT "summary_length" CHECK (("char_length"("summary") <= 120))
);


ALTER TABLE "public"."hacks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."tags_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tags_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tags_id_seq" OWNED BY "public"."tags"."id";



ALTER TABLE ONLY "public"."hack_covers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."hack_covers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tags" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tags_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."hack_covers"
    ADD CONSTRAINT "hack_covers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hack_covers"
    ADD CONSTRAINT "hack_covers_unique_position" UNIQUE ("hack_slug", "position");



ALTER TABLE ONLY "public"."hack_tags"
    ADD CONSTRAINT "hack_tags_pkey" PRIMARY KEY ("hack_slug", "tag_id");



ALTER TABLE ONLY "public"."hacks"
    ADD CONSTRAINT "hacks_pkey" PRIMARY KEY ("slug");



ALTER TABLE ONLY "public"."hacks"
    ADD CONSTRAINT "hacks_unique_author_title" UNIQUE ("author", "title");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



CREATE INDEX "hacks_approved_created_at_idx" ON "public"."hacks" USING "btree" ("approved", "created_at" DESC);



CREATE INDEX "hacks_created_by_idx" ON "public"."hacks" USING "btree" ("created_by");



CREATE INDEX "hacks_search_idx" ON "public"."hacks" USING "gin" ("search");



CREATE INDEX "hacks_summary_trgm_idx" ON "public"."hacks" USING "gin" ("summary" "public"."gin_trgm_ops");



CREATE INDEX "hacks_tags_gin_idx" ON "public"."hacks" USING "gin" ("tags");



CREATE INDEX "hacks_title_trgm_idx" ON "public"."hacks" USING "gin" ("title" "public"."gin_trgm_ops");



CREATE OR REPLACE TRIGGER "hacks_update_guard" BEFORE UPDATE ON "public"."hacks" FOR EACH ROW EXECUTE FUNCTION "public"."hacks_update_guard"();



CREATE OR REPLACE TRIGGER "set_hacks_updated_at" BEFORE UPDATE ON "public"."hacks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."hack_covers"
    ADD CONSTRAINT "hack_covers_hack_slug_fkey" FOREIGN KEY ("hack_slug") REFERENCES "public"."hacks"("slug") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hack_tags"
    ADD CONSTRAINT "hack_tags_hack_slug_fkey" FOREIGN KEY ("hack_slug") REFERENCES "public"."hacks"("slug") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hack_tags"
    ADD CONSTRAINT "hack_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hacks"
    ADD CONSTRAINT "hacks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can insert hacks for any user." ON "public"."hacks" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update any hack." ON "public"."hacks" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK (true);



CREATE POLICY "Admins can view any hack." ON "public"."hacks" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Authenticated users can insert hacks for themselves." ON "public"."hacks" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "created_by") AND ("approved" = false)));



CREATE POLICY "Only admins can modify tags." ON "public"."tags" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Owners can add covers to own hacks." ON "public"."hack_covers" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hacks" "h"
  WHERE (("h"."slug" = "hack_covers"."hack_slug") AND ("h"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Owners can add tags to own hacks." ON "public"."hack_tags" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hacks" "h"
  WHERE (("h"."slug" = "hack_tags"."hack_slug") AND ("h"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Owners can remove covers from own hacks." ON "public"."hack_covers" FOR DELETE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hacks" "h"
  WHERE (("h"."slug" = "hack_covers"."hack_slug") AND ("h"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Owners can remove tags from own hacks." ON "public"."hack_tags" FOR DELETE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hacks" "h"
  WHERE (("h"."slug" = "hack_tags"."hack_slug") AND ("h"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Owners can update covers on own hacks." ON "public"."hack_covers" FOR UPDATE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hacks" "h"
  WHERE (("h"."slug" = "hack_covers"."hack_slug") AND ("h"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Owners can view their unapproved hacks." ON "public"."hacks" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Public can view approved hacks." ON "public"."hacks" FOR SELECT USING (("approved" = true));



CREATE POLICY "Public can view covers for approved hacks." ON "public"."hack_covers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."hacks" "h"
  WHERE (("h"."slug" = "hack_covers"."hack_slug") AND (("h"."approved" = true) OR ("h"."created_by" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Public can view tags for approved hacks." ON "public"."hack_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."hacks" "h"
  WHERE (("h"."slug" = "hack_tags"."hack_slug") AND (("h"."approved" = true) OR ("h"."created_by" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Tags are viewable by everyone." ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Users can delete own hacks." ON "public"."hacks" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own hacks." ON "public"."hacks" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "created_by")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."hack_covers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hack_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hacks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hacks_update_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."hacks_update_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hacks_update_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."hack_covers" TO "anon";
GRANT ALL ON TABLE "public"."hack_covers" TO "authenticated";
GRANT ALL ON TABLE "public"."hack_covers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."hack_covers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."hack_covers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."hack_covers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."hack_tags" TO "anon";
GRANT ALL ON TABLE "public"."hack_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."hack_tags" TO "service_role";



GRANT ALL ON TABLE "public"."hacks" TO "anon";
GRANT ALL ON TABLE "public"."hacks" TO "authenticated";
GRANT ALL ON TABLE "public"."hacks" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


  create policy "Anyone can upload an avatar."
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'avatars'::text));



  create policy "Authenticated users can upload hack boxart."
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'hack-boxart'::text) AND (( SELECT auth.uid() AS uid) IS NOT NULL)));



  create policy "Authenticated users can upload hack covers."
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'hack-covers'::text) AND (( SELECT auth.uid() AS uid) IS NOT NULL)));



  create policy "Avatar images are publicly accessible."
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Hack boxart is publicly accessible."
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'hack-boxart'::text));



  create policy "Hack covers are publicly accessible."
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'hack-covers'::text));



