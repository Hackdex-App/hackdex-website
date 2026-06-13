-- Development seed data for local Supabase.
-- Run via: supabase db reset
--
-- Shared constants (keep in sync with scripts/seed-storage.mjs):
--   SEED_APPROVED_SLUG     = seed-emerald-demo
--   SEED_PENDING_SLUG      = seed-pending-demo
--   SEED_PATCH_OBJECT_KEY  = seed-emerald-demo-1.0.bps
--   SEED_PATCH_BUCKET      = patches

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fixed user UUIDs
-- admin:    11111111-1111-1111-1111-111111111111
-- creator:  22222222-2222-2222-2222-222222222222
-- creator2: 33333333-3333-3333-3333-333333333333

DO $$
DECLARE
  v_password text := crypt('Password1', gen_salt('bf'));
BEGIN
  -- Admin
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, phone_change_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@hackdex.local', v_password, now(),
    '', '', '', '',
    '', '', '',
    '{"provider":"email","providers":["email"],"claims_admin":true}'::jsonb,
    '{"full_name":"Admin User"}'::jsonb,
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@hackdex.local","email_verified":true}'::jsonb,
    'email', '11111111-1111-1111-1111-111111111111',
    now(), now(), now()
  );

  -- Creator (owns approved hack)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, phone_change_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'creator@hackdex.local', v_password, now(),
    '', '', '', '',
    '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Creator User"}'::jsonb,
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"creator@hackdex.local","email_verified":true}'::jsonb,
    'email', '22222222-2222-2222-2222-222222222222',
    now(), now(), now()
  );

  -- Creator 2 (owns pending hack)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, phone_change_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'creator2@hackdex.local', v_password, now(),
    '', '', '', '',
    '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Creator Two"}'::jsonb,
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"creator2@hackdex.local","email_verified":true}'::jsonb,
    'email', '33333333-3333-3333-3333-333333333333',
    now(), now(), now()
  );
END $$;

-- Profiles (handle_new_user trigger creates rows; set usernames for dashboard access)
UPDATE public.profiles SET username = 'admin',   full_name = 'Admin User',   verified = true  WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET username = 'creator', full_name = 'Creator User', verified = true  WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET username = 'creator2', full_name = 'Creator Two', verified = false WHERE id = '33333333-3333-3333-3333-333333333333';

-- Tag catalog
INSERT INTO public.tags (id, name, category) VALUES
  (1,  'Complete Pokédex', 'Pokédex'),
  (2,  'Gen 3',            'Category'),
  (3,  'New Story',        'New'),
  (4,  'Hard Mode',        'Difficulty'),
  (5,  'QoL',              'Quality of Life'),
  (6,  'Physical/Special Split', 'Gameplay'),
  (7,  'New Pokémon',      'New'),
  (8,  'Updated Sprites',  'Graphics'),
  (9,  'Open World',       'Gameplay'),
  (10, 'Nuzlocke',         'Gameplay'),
  (11, 'Rom Hack',         'Category'),
  (12, 'Fan Game',         'Category');

SELECT setval(pg_get_serial_sequence('public.tags', 'id'), (SELECT MAX(id) FROM public.tags));

-- Approved hack (poke_emerald + patch metadata; BPS uploaded via npm run seed:storage)
INSERT INTO public.hacks (
  slug, title, summary, description, base_rom, patch_url, version,
  created_by, language, approved, approved_at, approved_by,
  completion_status, patches_download_permission, downloads,
  is_archive, published
) VALUES (
  'seed-emerald-demo',
  'Seed Emerald Demo',
  'Approved dev hack for testing discover, download, and in-browser patching.',
  'This is seeded development data. It uses the example BPS patch for Pokémon Emerald. Run `npm run seed:storage` after `supabase db reset` to upload the patch file to MinIO.',
  'poke_emerald',
  '',
  '1.0',
  '22222222-2222-2222-2222-222222222222',
  'English',
  true,
  now(),
  '11111111-1111-1111-1111-111111111111',
  'Complete',
  'Current',
  42,
  false,
  false
);

-- Pending hack (no patch — for admin approval flow)
INSERT INTO public.hacks (
  slug, title, summary, description, base_rom, patch_url, version,
  created_by, language, approved,
  completion_status, patches_download_permission, downloads,
  is_archive, published
) VALUES (
  'seed-pending-demo',
  'Seed Pending Demo',
  'Pending dev hack for testing the admin approval dashboard.',
  'This hack is intentionally unapproved. Log in as admin@hackdex.local to review it on the dashboard.',
  'poke_emerald',
  '',
  '0.1',
  '33333333-3333-3333-3333-333333333333',
  'English',
  false,
  'Beta',
  'None',
  0,
  false,
  false
);

-- Patch row for approved hack (current_patch set after insert due to circular FK)
INSERT INTO public.patches (
  parent_hack, version, filename, bucket, published, published_at, changelog
) VALUES (
  'seed-emerald-demo',
  '1.0',
  'seed-emerald-demo-1.0.bps',
  'patches',
  true,
  now(),
  'Initial seeded version for local development.'
);

UPDATE public.hacks
SET current_patch = (SELECT id FROM public.patches WHERE filename = 'seed-emerald-demo-1.0.bps' LIMIT 1)
WHERE slug = 'seed-emerald-demo';

-- Tags on approved hack
INSERT INTO public.hack_tags (hack_slug, tag_id, "order") VALUES
  ('seed-emerald-demo', 3,  1),
  ('seed-emerald-demo', 5,  2),
  ('seed-emerald-demo', 11, 3);
