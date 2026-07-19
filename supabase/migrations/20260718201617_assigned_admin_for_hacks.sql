alter table if exists public.hacks
  add column if not exists assigned_admin uuid;

alter table public.hacks add constraint "hacks_assigned_admin_fkey" FOREIGN KEY (assigned_admin) REFERENCES auth.users(id) ON DELETE SET NULL not valid;
alter table public.hacks validate constraint "hacks_assigned_admin_fkey";
