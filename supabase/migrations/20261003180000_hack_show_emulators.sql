-- Creators can hide the recommended emulators on their hack page and list their own in the description.
alter table public.hacks
  add column show_emulators boolean not null default true;
