-- Hacks are only ever soft-deleted, by an admin (deleteHack, with the service role). These policies
-- predate that and let owners and archivers hard-delete active rows through the API, which cascades
-- to the hack's patches, covers, and tags and skips deleted_by.
drop policy if exists "Users can delete own hacks." on public.hacks;
drop policy if exists "Archivers can delete archive hacks." on public.hacks;

-- TRUNCATE skips RLS entirely, so it goes with DELETE.
revoke delete, truncate on table public.hacks from anon, authenticated;
