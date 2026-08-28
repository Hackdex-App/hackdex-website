-- Additive resume diagnostics for patch download telemetry.

alter table public.patch_download_events
  add column if not exists resume_count integer
    check (resume_count is null or resume_count >= 0),
  add column if not exists received_bytes bigint
    check (received_bytes is null or received_bytes >= 0);
