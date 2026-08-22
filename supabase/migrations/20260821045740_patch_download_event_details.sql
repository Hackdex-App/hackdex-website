-- Additive diagnostics for patch download telemetry. Original table is unchanged.

alter table public.patch_download_events
  add column if not exists failure_phase text
    check (failure_phase in ('request', 'response', 'body')),
  add column if not exists response_status integer
    check (response_status is null or (response_status >= 100 and response_status <= 599)),
  add column if not exists content_length bigint
    check (content_length is null or content_length >= 0),
  add column if not exists content_encoding text,
  add column if not exists content_type text,
  add column if not exists encoded_body_size bigint
    check (encoded_body_size is null or encoded_body_size >= 0),
  add column if not exists decoded_body_size bigint
    check (decoded_body_size is null or decoded_body_size >= 0),
  add column if not exists page_origin text,
  add column if not exists correlation_id text,
  add column if not exists sample_rate double precision
    check (sample_rate is null or (sample_rate > 0 and sample_rate <= 1));
