DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Tag Categories'
      AND e.enumlabel = 'Sprites'
  ) THEN
    ALTER TYPE public."Tag Categories" RENAME VALUE 'Sprites' TO 'Graphics';
  END IF;
END $$;
