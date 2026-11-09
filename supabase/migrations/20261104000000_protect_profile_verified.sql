-- verified drives the creator badge, and only an admin may grant it (approveHack, with the service
-- role). The profile policies only check that a row is the caller's own, so anyone could set it on
-- themselves through the API.
--
-- A column-level REVOKE alone does not subtract from a table-level grant, so drop the table grants,
-- then grant writes on every column except verified. Columns added later stay read-only to API
-- callers until they're granted here too. anon has no write policies and gets no grant back.
revoke insert, update on table public.profiles from anon, authenticated;

-- id is included because a PostgREST upsert sets every column in its payload, id too. The RLS check
-- still pins it to the caller.
grant
  insert (id, updated_at, username, full_name, avatar_url, website),
  update (id, updated_at, username, full_name, avatar_url, website)
on table public.profiles to authenticated;

notify pgrst, 'reload schema';
