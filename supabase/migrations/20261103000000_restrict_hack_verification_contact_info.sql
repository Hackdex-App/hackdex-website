-- verification_contact_info is creator PII. The public hacks policy only checks
-- approved = true, so anon can select the column directly through PostgREST even
-- though the app nulls it after a service-role read.
--
-- A column-level REVOKE alone does not subtract from a table-level SELECT grant,
-- so first drop the table grant, then grant SELECT on every column except
-- verification_contact_info. The app reads this column with the service-role client
-- and every anon/authenticated hacks query names its columns explicitly, so this
-- does not change application behavior.

revoke select on table public.hacks from anon, authenticated;

do $$
declare
  allowed_columns text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
    into allowed_columns
    from pg_attribute
   where attrelid = 'public.hacks'::regclass
     and attnum > 0
     and not attisdropped
     and attname <> 'verification_contact_info';

  if allowed_columns is null then
    raise exception 'public.hacks has no selectable columns';
  end if;

  execute format(
    'grant select (%s) on table public.hacks to anon, authenticated',
    allowed_columns
  );
end $$;

notify pgrst, 'reload schema';
