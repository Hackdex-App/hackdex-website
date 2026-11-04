-- Direct database API callers can't forge creator verification or hard-delete hacks, while profile
-- editing, hack editing, and the service-role verify and soft-delete flows keep working.
-- Run with: supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'owner@test.local'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'archiver@test.local');

insert into public.hacks (slug, title, summary, description, base_rom, patch_url, version, language, created_by, is_archive, original_author) values
  ('owned-hack', 'Owned', 's', 'd', 'poke_emerald', '', '1.0', 'English', 'aaaaaaaa-0000-4000-8000-000000000001', false, null),
  ('archive-hack', 'Archive', 's', 'd', 'poke_emerald', '', '1.0', 'English', 'aaaaaaaa-0000-4000-8000-000000000002', true, 'Someone');

-- The owner, signed in with an ordinary session.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$ update public.profiles set verified = true where id = auth.uid() $$,
  '42501', null, 'owner cannot update verified'
);
select throws_ok(
  $$ insert into public.profiles (id, verified) values (auth.uid(), true)
     on conflict (id) do update set verified = excluded.verified $$,
  '42501', null, 'owner cannot upsert verified'
);

-- The same statement PostgREST builds for the account forms' upserts.
select lives_ok(
  $$ insert into public.profiles (id, username, full_name, website, avatar_url, updated_at)
     values (auth.uid(), 'owner', 'Owner', 'https://example.com', 'avatar.png', now())
     on conflict (id) do update set
       id = excluded.id, username = excluded.username, full_name = excluded.full_name,
       website = excluded.website, avatar_url = excluded.avatar_url, updated_at = excluded.updated_at $$,
  'owner can still edit their profile through an upsert'
);
select is((select username from public.profiles where id = auth.uid()), 'owner', 'profile edit applied');

select throws_ok(
  $$ delete from public.hacks where slug = 'owned-hack' $$,
  '42501', null, 'owner cannot hard-delete their hack'
);
select throws_ok(
  $$ truncate public.hacks $$,
  '42501', null, 'owner cannot truncate hacks'
);
select lives_ok(
  $$ update public.hacks set title = 'Renamed' where slug = 'owned-hack' $$,
  'owner can still edit their hack'
);
select is((select title from public.hacks where slug = 'owned-hack'), 'Renamed', 'hack edit applied');

-- An archiver, whose role comes from protected app_metadata.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"archiver":true}}', true);

select throws_ok(
  $$ delete from public.hacks where slug = 'archive-hack' $$,
  '42501', null, 'archiver cannot hard-delete an archive hack'
);
select lives_ok(
  $$ update public.hacks set title = 'Archive renamed' where slug = 'archive-hack' $$,
  'archiver can still edit an archive hack'
);
select is((select title from public.hacks where slug = 'archive-hack'), 'Archive renamed', 'archive edit applied');

-- An unauthenticated caller has no write path at all.
reset role;
set local role anon;
select throws_ok(
  $$ delete from public.hacks where slug = 'archive-hack' $$,
  '42501', null, 'anon cannot hard-delete a hack'
);
select throws_ok(
  $$ insert into public.profiles (id) values ('aaaaaaaa-0000-4000-8000-000000000003') $$,
  '42501', null, 'anon cannot insert a profile'
);

-- approveHack and deleteHack use the service role.
reset role;
set local role service_role;
update public.profiles set verified = true where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select ok(
  (select verified from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'service role can verify a creator'
);
update public.hacks
set deleted_at = now(), deleted_by = 'aaaaaaaa-0000-4000-8000-000000000002'
where slug = 'owned-hack';
select isnt(
  (select deleted_at from public.hacks where slug = 'owned-hack'), null,
  'service role can soft-delete a hack'
);

-- A verified creator's own later edit doesn't drop their badge.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
update public.profiles set full_name = 'Still verified' where id = auth.uid();
select ok(
  (select verified from public.profiles where id = auth.uid()),
  'editing a profile keeps its verified badge'
);

select * from finish();
rollback;
