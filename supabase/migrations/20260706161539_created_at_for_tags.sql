-- All existing tags will have null created_at values
-- but future tags will default to now()
alter table "public"."tags"
  add column "created_at" timestamp with time zone;
alter table "public"."tags"
  alter column "created_at" set default now();

-- All existing hacks will use created_at for tags_updated_at
-- but future hacks will default to now()
alter table "public"."hacks"
  add column "tags_updated_at" timestamp with time zone;
update "public"."hacks"
  set tags_updated_at = created_at
  where tags_updated_at is null;
alter table "public"."hacks"
  alter column "tags_updated_at" set default now();
alter table "public"."hacks"
  alter column "tags_updated_at" set not null;
