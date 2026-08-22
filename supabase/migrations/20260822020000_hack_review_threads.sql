create table public.hack_review_threads (
  hack_slug text primary key references public.hacks(slug) on update cascade on delete cascade,
  discord_thread_id text not null unique,
  discord_parent_channel_id text not null,
  reply_token text not null unique,
  resend_last_email_id text,
  resend_last_message_id text,
  created_at timestamptz not null default now()
);

alter table public.hack_review_threads enable row level security;
