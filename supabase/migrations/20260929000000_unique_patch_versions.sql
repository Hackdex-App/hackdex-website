-- One row per version per hack. The app checks before inserting, but two
-- uploads finishing together could both pass that check.
-- If this fails on existing data, find the duplicates with:
--   select parent_hack, version, count(*) from public.patches group by 1, 2 having count(*) > 1;
create unique index if not exists patches_parent_hack_version_key on public.patches (parent_hack, version);
