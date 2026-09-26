-- Creator-reported AI use, one level per area (Terms 1.1.0, Section 6).
-- All six are null until the creator fills in the form; after that all six are set.
create type public.ai_level as enum ('none', 'little', 'some', 'most', 'all');

alter table public.hacks
  add column ai_graphics public.ai_level,
  add column ai_music public.ai_level,
  add column ai_story public.ai_level,
  add column ai_translation public.ai_level,
  add column ai_events public.ai_level,
  add column ai_code public.ai_level,
  -- Optional explanation shown to players under the breakdown.
  add column ai_note text,
  -- When the creator last filled in or confirmed the form.
  add column ai_disclosed_at timestamp with time zone;

alter table public.hacks
  add constraint hacks_ai_all_or_none check (
    num_nulls(ai_graphics, ai_music, ai_story, ai_translation, ai_events, ai_code) in (0, 6)
    and (ai_code is null) = (ai_disclosed_at is null)
  ),
  -- Content areas only use None / Some / Most; the finer scale is for code.
  add constraint hacks_ai_content_levels check (
    coalesce(ai_graphics, 'none') in ('none', 'some', 'most')
    and coalesce(ai_music, 'none') in ('none', 'some', 'most')
    and coalesce(ai_story, 'none') in ('none', 'some', 'most')
    and coalesce(ai_translation, 'none') in ('none', 'some', 'most')
    and coalesce(ai_events, 'none') in ('none', 'some', 'most')
  ),
  add constraint hacks_ai_note_length check (char_length(ai_note) <= 1000);
