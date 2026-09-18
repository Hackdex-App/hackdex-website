-- A hack starts as a private draft and becomes visible to reviewers once the
-- creator submits it. null = draft (creator only); set = in the review queue.
alter table if exists public.hacks
  add column if not exists submitted_at timestamp with time zone;

-- Everything that exists today was submitted the moment it was created.
update public.hacks set submitted_at = created_at where submitted_at is null;
