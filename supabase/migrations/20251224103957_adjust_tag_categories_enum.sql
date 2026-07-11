DO $$ BEGIN
  if exists (select 1 from pg_type where typname = 'Tag Categories' and typtype = 'e' and typarray = 0) then
    alter type public."Tag Categories" rename value 'Sprites' to 'Graphics';
  end if;
END $$;

alter type public."Tag Categories" add value if not exists 'Category';
