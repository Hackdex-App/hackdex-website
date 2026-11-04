-- Avatars are validated and re-encoded by the server before upload.
-- The service client bypasses RLS; browser clients must not write directly.
drop policy if exists "Anyone can upload an avatar." on storage.objects;
