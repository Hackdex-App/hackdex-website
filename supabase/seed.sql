-- Development seed data for local Supabase.
-- Run via: supabase db reset (or supabase db query --local -f supabase/seed.sql)
--
-- Shared constants (keep in sync with scripts/seed-storage.mjs):
--   SEED_SHARED_BPS      = seed-shared.bps
--   SEED_APPROVED_SLUG   = seed-emerald-demo
--   SEED_PENDING_SLUG    = seed-pending-demo

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

-- Tag catalog (103 tags from prod-like export; tags 93/94/96 use now() for New-tag demo on seed-emerald-demo)
INSERT INTO public.tags (id, name, category, created_at) VALUES
  (1, 'Additional Story', 'Altered', null),
  (2, 'Day/Night Cycle', 'Altered', null),
  (3, 'Double Battles', 'Altered', null),
  (4, 'Fairy Type', 'Altered', null),
  (5, 'Gigantamax', 'Altered', null),
  (6, 'Megas', 'Altered', null),
  (7, 'Move Changes', 'Altered', null),
  (8, 'PSS', 'Altered', null),
  (9, 'Stat Changes', 'Altered', null),
  (10, 'Tera', 'Altered', null),
  (11, 'Type Changes', 'Altered', null),
  (12, 'Type Chart Changes', 'Altered', null),
  (13, 'Z-Moves', 'Altered', null),
  (14, 'Difficulty Options', 'Difficulty', null),
  (15, 'Easy', 'Difficulty', null),
  (16, 'Hard', 'Difficulty', null),
  (17, 'Kaizo Difficulty', 'Difficulty', null),
  (18, 'Level Caps (Mandatory)', 'Difficulty', null),
  (19, 'Level Caps (Optional)', 'Difficulty', null),
  (20, 'Nuzlocke Mode', 'Difficulty', null),
  (21, 'Rare Candies', 'Difficulty', null),
  (22, 'Vanilla+ Difficulty', 'Difficulty', null),
  (23, 'Vanilla++ Difficulty', 'Difficulty', null),
  (24, 'Demo', 'Gameplay', null),
  (25, 'Level Scaling', 'Difficulty', null),
  (26, 'Multiplayer Compatibility', 'Gameplay', null),
  (27, 'Open World', 'Gameplay', null),
  (28, 'Post-Game Content', 'Gameplay', null),
  (29, 'Quests', 'Gameplay', null),
  (30, 'Roguelite', 'Category', null),
  (31, 'Story', 'Category', null),
  (32, 'Vanilla Multiplayer Compatibility', 'Gameplay', null),
  (33, 'Custom Abilities', 'New', null),
  (34, 'Custom Battle Gimmick', 'New', null),
  (35, 'Custom Moves', 'New', null),
  (36, 'Custom Types', 'New', null),
  (37, 'New Items', 'New', null),
  (38, 'New Mechanics', 'New', null),
  (39, 'New Music', 'New', null),
  (40, 'New Region', 'New', null),
  (41, 'Betamon', 'Pokédex', null),
  (42, 'Custom Dex', 'Pokédex', null),
  (43, 'Custom Megas', 'Pokédex', null),
  (44, 'Custom Regionals', 'Pokédex', null),
  (45, 'Fakemon', 'Pokédex', null),
  (46, 'Fusions', 'Pokédex', null),
  (47, 'Gen 1 NatDex', 'Pokédex', null),
  (48, 'Gen 2 NatDex', 'Pokédex', null),
  (49, 'Gen 3 NatDex', 'Pokédex', null),
  (50, 'Gen 4 NatDex', 'Pokédex', null),
  (51, 'Gen 5 NatDex', 'Pokédex', null),
  (52, 'Gen 6 NatDex', 'Pokédex', null),
  (53, 'Gen 7 NatDex', 'Pokédex', null),
  (54, 'Gen 8 NatDex', 'Pokédex', null),
  (55, 'Gen 9 NatDex', 'Pokédex', null),
  (56, 'New Forms', 'Pokédex', null),
  (57, 'Some Fakemon', 'Pokédex', null),
  (58, 'Vanilla Dex', 'Pokédex', null),
  (59, 'Bug Fixes', 'Quality of Life', null),
  (60, 'Built-in Randomizer', 'Quality of Life', null),
  (61, 'Clarified Natures', 'Quality of Life', null),
  (62, 'Decapitalization', 'Quality of Life', null),
  (63, 'DexNav', 'Quality of Life', null),
  (64, 'Easy EVs/IVs/DVs', 'Quality of Life', null),
  (65, 'Easy EXP', 'Quality of Life', null),
  (66, 'Following Pokémon', 'Quality of Life', null),
  (67, 'HM Improvements', 'Quality of Life', null),
  (68, 'Reusable TMs', 'Quality of Life', null),
  (69, 'Revised Trade Evos', 'Quality of Life', null),
  (70, 'Running Shoes', 'Quality of Life', null),
  (71, 'Tons of QoL', 'Quality of Life', null),
  (72, 'Visible IVs/EVs/DVs', 'Quality of Life', null),
  (73, 'Wonder Trade', 'Quality of Life', null),
  (74, '<1 hour', 'Scale', null),
  (75, '1-2 hrs', 'Scale', null),
  (76, '2-4 hrs', 'Scale', null),
  (77, '4-8 hrs', 'Scale', null),
  (78, '8+ hrs', 'Scale', null),
  (79, 'New Graphics', 'Graphics', null),
  (80, 'Vanilla Graphics', 'Graphics', null),
  (81, 'Comedy', 'Tone', null),
  (82, 'Exploration', 'Tone', null),
  (83, 'Lighthearted', 'Tone', null),
  (84, 'Mature', 'Tone', null),
  (85, 'Non-Traditional', 'Category', null),
  (86, 'Puzzle', 'Category', null),
  (87, 'Traditional', 'Category', null),
  (88, 'CFRU', null, null),
  (89, 'hg-engine', null, null),
  (90, 'pokeemerald-expansion', null, null),
  (91, 'Vanilla', 'Gameplay', '2026-01-01 07:00:00+00'),
  (92, 'Translation', 'Altered', '2026-01-01 07:00:00+00'),
  (93, 'Demake', 'Category', now()),
  (94, 'Minigame', 'Category', now()),
  (95, 'Escape Room', 'Category', '2026-01-01 07:00:00+00'),
  (96, 'Technical Concept', 'Category', now()),
  (97, '<100 Dex Size', 'Pokédex', '2026-01-01 07:00:00+00'),
  (98, '100-300 Dex Size', 'Pokédex', '2026-01-01 07:00:00+00'),
  (99, '300-500 Dex Size', 'Pokédex', '2026-01-01 07:00:00+00'),
  (100, '500-700 Dex Size', 'Pokédex', '2026-01-01 07:00:00+00'),
  (101, '700+ Dex Size', 'Pokédex', null),
  (102, 'Built-in Cheats', 'Quality of Life', null),
  (103, 'Profanity', 'Tone', null);

SELECT setval(pg_get_serial_sequence('public.tags', 'id'), (SELECT MAX(id) FROM public.tags));

-- Hacks (19 total; tags_updated_at past on emerald + pending-demo for New-tag demo)
INSERT INTO public.hacks (
  slug, title, summary, description, base_rom, patch_url, version,
  created_by, language, approved, approved_at, approved_by,
  completion_status, patches_download_permission, downloads,
  is_archive, published, tags_updated_at,
  original_author, permission_from
) VALUES
  (
    'seed-emerald-demo',
    'Seed Emerald Demo',
    'Approved dev hack for discover, download, and in-browser patching.',
    'Seeded development data using the shared example BPS for Pokémon Emerald. Run npm run seed:storage after db reset.',
    'poke_emerald', '', '1.0',
    '22222222-2222-2222-2222-222222222222',
    'English', true, now(), '11111111-1111-1111-1111-111111111111',
    'Complete', 'Current', 42,
    false, false, now() - interval '30 days',
    null, null
  ),
  (
    'seed-pending-demo',
    'Seed Pending Demo',
    'Pending dev hack for testing the admin approval dashboard.',
    'Intentionally unapproved. Log in as admin@hackdex.local to review on the dashboard.',
    'poke_emerald', '', '0.1',
    '33333333-3333-3333-3333-333333333333',
    'English', false, null, null,
    'Beta', 'None', 0,
    false, false, now() - interval '30 days',
    null, null
  ),
  (
    'seed-pending-ready',
    'Seed Pending Ready',
    'Pending hack with patch, covers, and tags — ready for admin review.',
    'Has patch and gallery metadata so approve UI shows no missing-screenshot or missing-patch warnings.',
    'poke_emerald', '', '0.2',
    '33333333-3333-3333-3333-333333333333',
    'English', false, null, null,
    'Beta', 'None', 0,
    false, false, default,
    null, null
  ),
  (
    'seed-all-downloads',
    'Seed All Downloads',
    'Approved hack with All download permission across published versions.',
    'Tests direct BPS download on every published version row.',
    'poke_emerald', '', '2.0',
    '22222222-2222-2222-2222-222222222222',
    'English', true, now(), '11111111-1111-1111-1111-111111111111',
    'Alpha', 'All', 10,
    false, false, default,
    null, null
  ),
  (
    'seed-current-only',
    'Seed Current Only',
    'Approved hack with Current download permission.',
    'Direct download only on the current published patch version.',
    'poke_emerald', '', '2.0',
    '22222222-2222-2222-2222-222222222222',
    'English', true, now(), '11111111-1111-1111-1111-111111111111',
    'Complete', 'Current', 5,
    false, false, default,
    null, null
  ),
  (
    'seed-draft-version',
    'Seed Draft Version',
    'Approved hack with a published current version and an unpublished draft.',
    'Tests draft/publish UI in the version editor.',
    'poke_emerald', '', '2.0',
    '22222222-2222-2222-2222-222222222222',
    'English', true, now(), '11111111-1111-1111-1111-111111111111',
    'Complete', 'Current', 3,
    false, false, default,
    null, null
  ),
  (
    'seed-archived-version',
    'Seed Archived Version',
    'Approved hack with an archived older version and a current release.',
    'Tests show-archived and restore flows on the versions page.',
    'poke_emerald', '', '2.0',
    '22222222-2222-2222-2222-222222222222',
    'English', true, now(), '11111111-1111-1111-1111-111111111111',
    'Complete', 'Current', 7,
    false, false, default,
    null, null
  ),
  (
    'seed-archive-info',
    'Seed Archive Info',
    'Informational archive hack with no downloadable patch.',
    'Tests archive banner and gallery without a current patch.',
    'poke_emerald', '', 'Archive',
    '11111111-1111-1111-1111-111111111111',
    'English', true, now(), '11111111-1111-1111-1111-111111111111',
    'Complete', 'None', 0,
    true, false, default,
    'Lost Hack Team', null
  ),
  (
    'seed-archive-download',
    'Seed Archive Download',
    'Downloadable archive hack with permission attribution.',
    'Tests archive download flow with permission_from metadata.',
    'poke_emerald', '', '1.0',
    '11111111-1111-1111-1111-111111111111',
    'English', true, now(), '11111111-1111-1111-1111-111111111111',
    'Complete', 'Current', 15,
    true, false, default,
    'Retro Creator', 'Retro Creator'
  ),
  (
    'seed-third-party',
    'Seed Third Party',
    'Approved hack credited to an external original author.',
    'Tests third-party author and permission display on the hack page.',
    'poke_emerald', '', '1.0',
    '22222222-2222-2222-2222-222222222222',
    'English', true, now(), '11111111-1111-1111-1111-111111111111',
    'Complete', 'Current', 20,
    false, false, default,
    'Famous Hacker', 'Famous Hacker'
  );

-- Nine patcher-only sandboxes (3 per owner account)
DO $$
DECLARE
  v_admin    uuid := '11111111-1111-1111-1111-111111111111';
  v_creator  uuid := '22222222-2222-2222-2222-222222222222';
  v_creator2 uuid := '33333333-3333-3333-3333-333333333333';
  v_owner record;
  v_slug text;
  v_num int;
  v_idx int := 0;
  v_tag_set_idx int;
  v_tags int[];
  v_tag_id int;
  v_pos int;
  v_cover int;
BEGIN
  FOR v_owner IN
    SELECT * FROM (VALUES
      ('admin', v_admin),
      ('creator', v_creator),
      ('creator2', v_creator2)
    ) AS owners(label, uid)
  LOOP
    FOR v_num IN 1..3 LOOP
      v_idx := v_idx + 1;
      v_slug := 'seed-patcher-only-' || v_owner.label || '-' || v_num;
      v_tag_set_idx := (v_idx - 1) % 3;
      IF v_tag_set_idx = 0 THEN
        v_tags := ARRAY[27, 71, 49];
      ELSIF v_tag_set_idx = 1 THEN
        v_tags := ARRAY[16, 71, 90];
      ELSE
        v_tags := ARRAY[31, 71, 49];
      END IF;

      INSERT INTO public.hacks (
        slug, title, summary, description, base_rom, patch_url, version,
        created_by, language, approved, approved_at, approved_by,
        completion_status, patches_download_permission, downloads,
        is_archive, published, tags_updated_at
      ) VALUES (
        v_slug,
        'Seed Patcher Only ' || initcap(v_owner.label) || ' ' || v_num,
        'Editable sandbox with patcher-only download permission (None).',
        'Approved sandbox for testing in-browser patcher with no direct BPS download.',
        'poke_emerald', '', '2.0',
        v_owner.uid,
        'English', true, now(), v_admin,
        'Complete', 'None', 0,
        false, false, default
      );

      INSERT INTO public.patches (parent_hack, version, filename, bucket, published, published_at, changelog)
      VALUES
        (v_slug, '1.0', 'seed-shared.bps', 'patches', true, now(), 'Initial sandbox version.'),
        (v_slug, '1.1', 'seed-shared.bps', 'patches', true, now(), 'Minor sandbox update.'),
        (v_slug, '2.0', 'seed-shared.bps', 'patches', true, now(), 'Current sandbox version.');

      UPDATE public.hacks
      SET current_patch = (
        SELECT id FROM public.patches
        WHERE parent_hack = v_slug AND version = '2.0'
        LIMIT 1
      )
      WHERE slug = v_slug;

      v_pos := 0;
      FOREACH v_tag_id IN ARRAY v_tags LOOP
        v_pos := v_pos + 1;
        INSERT INTO public.hack_tags (hack_slug, tag_id, "order")
        VALUES (v_slug, v_tag_id, v_pos);
      END LOOP;

      FOR v_cover IN 1..3 LOOP
        INSERT INTO public.hack_covers (hack_slug, url, position)
        VALUES (v_slug, v_slug || '/cover-' || v_cover || '.png', v_cover);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Patches for non-sandbox hacks (all use shared seed-shared.bps object key)
INSERT INTO public.patches (parent_hack, version, filename, bucket, published, published_at, changelog) VALUES
  ('seed-emerald-demo', '1.0', 'seed-shared.bps', 'patches', true, now(), 'Initial seeded version for local development.'),
  ('seed-pending-ready', '0.2', 'seed-shared.bps', 'patches', true, now(), 'Ready-for-review pending version.'),
  ('seed-all-downloads', '1.0', 'seed-shared.bps', 'patches', true, now(), 'First published version.'),
  ('seed-all-downloads', '2.0', 'seed-shared.bps', 'patches', true, now(), 'Current published version.'),
  ('seed-current-only', '1.0', 'seed-shared.bps', 'patches', true, now(), 'First published version.'),
  ('seed-current-only', '2.0', 'seed-shared.bps', 'patches', true, now(), 'Current published version.'),
  ('seed-draft-version', '1.0', 'seed-shared.bps', 'patches', true, now(), 'First published version.'),
  ('seed-draft-version', '2.0', 'seed-shared.bps', 'patches', true, now(), 'Current published version.'),
  ('seed-draft-version', '2.1', 'seed-shared.bps', 'patches', false, null, 'Unpublished draft version.'),
  ('seed-archived-version', '1.0', 'seed-shared.bps', 'patches', true, now(), 'Archived older version.'),
  ('seed-archived-version', '2.0', 'seed-shared.bps', 'patches', true, now(), 'Current published version.'),
  ('seed-archive-download', '1.0', 'seed-shared.bps', 'patches', true, now(), 'Archive download version.'),
  ('seed-third-party', '1.0', 'seed-shared.bps', 'patches', true, now(), 'Third-party credited version.');

UPDATE public.patches
SET archived = true, archived_at = now()
WHERE parent_hack = 'seed-archived-version' AND version = '1.0';

UPDATE public.hacks SET current_patch = (SELECT id FROM public.patches WHERE parent_hack = 'seed-emerald-demo' AND version = '1.0' LIMIT 1) WHERE slug = 'seed-emerald-demo';
UPDATE public.hacks SET current_patch = (SELECT id FROM public.patches WHERE parent_hack = 'seed-pending-ready' AND version = '0.2' LIMIT 1) WHERE slug = 'seed-pending-ready';
UPDATE public.hacks SET current_patch = (SELECT id FROM public.patches WHERE parent_hack = 'seed-all-downloads' AND version = '2.0' LIMIT 1) WHERE slug = 'seed-all-downloads';
UPDATE public.hacks SET current_patch = (SELECT id FROM public.patches WHERE parent_hack = 'seed-current-only' AND version = '2.0' LIMIT 1) WHERE slug = 'seed-current-only';
UPDATE public.hacks SET current_patch = (SELECT id FROM public.patches WHERE parent_hack = 'seed-draft-version' AND version = '2.0' LIMIT 1) WHERE slug = 'seed-draft-version';
UPDATE public.hacks SET current_patch = (SELECT id FROM public.patches WHERE parent_hack = 'seed-archived-version' AND version = '2.0' LIMIT 1) WHERE slug = 'seed-archived-version';
UPDATE public.hacks SET current_patch = (SELECT id FROM public.patches WHERE parent_hack = 'seed-archive-download' AND version = '1.0' LIMIT 1) WHERE slug = 'seed-archive-download';
UPDATE public.hacks SET current_patch = (SELECT id FROM public.patches WHERE parent_hack = 'seed-third-party' AND version = '1.0' LIMIT 1) WHERE slug = 'seed-third-party';

-- hack_tags (all complete hacks except seed-pending-demo)
INSERT INTO public.hack_tags (hack_slug, tag_id, "order") VALUES
  ('seed-emerald-demo', 31, 1),
  ('seed-emerald-demo', 71, 2),
  ('seed-emerald-demo', 90, 3),
  ('seed-emerald-demo', 49, 4),
  ('seed-pending-ready', 31, 1),
  ('seed-pending-ready', 59, 2),
  ('seed-pending-ready', 71, 3),
  ('seed-all-downloads', 26, 1),
  ('seed-all-downloads', 71, 2),
  ('seed-all-downloads', 79, 3),
  ('seed-current-only', 27, 1),
  ('seed-current-only', 49, 2),
  ('seed-current-only', 71, 3),
  ('seed-draft-version', 31, 1),
  ('seed-draft-version', 71, 2),
  ('seed-draft-version', 90, 3),
  ('seed-archived-version', 28, 1),
  ('seed-archived-version', 49, 2),
  ('seed-archived-version', 71, 3),
  ('seed-archive-info', 85, 1),
  ('seed-archive-info', 31, 2),
  ('seed-archive-info', 82, 3),
  ('seed-archive-download', 87, 1),
  ('seed-archive-download', 49, 2),
  ('seed-archive-download', 71, 3),
  ('seed-third-party', 45, 1),
  ('seed-third-party', 71, 2),
  ('seed-third-party', 31, 3);

-- hack_covers (18 complete hacks × 3 covers; seed-pending-demo has none)
DO $$
DECLARE
  v_slug text;
BEGIN
  FOREACH v_slug IN ARRAY ARRAY[
    'seed-emerald-demo',
    'seed-pending-ready',
    'seed-all-downloads',
    'seed-current-only',
    'seed-draft-version',
    'seed-archived-version',
    'seed-archive-info',
    'seed-archive-download',
    'seed-third-party'
  ] LOOP
    INSERT INTO public.hack_covers (hack_slug, url, position) VALUES
      (v_slug, v_slug || '/cover-1.png', 1),
      (v_slug, v_slug || '/cover-2.png', 2),
      (v_slug, v_slug || '/cover-3.png', 3);
  END LOOP;
END $$;
