-- fk lookup indexes
create index if not exists index_hack_covers_hack_slug on public.hack_covers(hack_slug);
create index if not exists index_hack_tags_hack_slug on public.hack_tags(hack_slug);
create index if not exists index_patches_parent_hack on public.patches(parent_hack);

-- analytics date range queries
create index if not exists index_patch_downloads_created_at on public.patch_downloads(created_at);

-- discover page sorts
create index if not exists index_hacks_downloads_desc on public.hacks(downloads desc) where approved = true;
create index if not exists index_hacks_updated_at_desc on public.hacks(updated_at desc) where approved = true;

-- discover filtering
create index if not exists index_hacks_base_rom on public.hacks(base_rom) where approved = true;
create index if not exists index_hacks_original_author on public.hacks(original_author) where original_author is not null;

