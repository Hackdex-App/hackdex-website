alter table if exists public.hacks
  add column if not exists youtube_video_id text,
  add column if not exists video_first boolean default false;

