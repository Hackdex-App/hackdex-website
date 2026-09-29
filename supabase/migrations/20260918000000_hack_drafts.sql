-- A hack starts as a private draft and becomes visible to reviewers once the
-- creator submits it. null = draft (creator only); set = in the review queue.
alter table if exists public.hacks
  add column if not exists submitted_at timestamp with time zone;

-- Everything that exists today was submitted the moment it was created.
-- Skip the updated_at trigger so the backfill doesn't stamp every hack with
-- migration day (dashboards sort by it, and it feeds OpenGraph modifiedTime).
alter table public.hacks disable trigger set_hacks_updated_at;
update public.hacks set submitted_at = created_at where submitted_at is null;
alter table public.hacks enable trigger set_hacks_updated_at;
