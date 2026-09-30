ALTER TABLE IF EXISTS public.hacks 
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Reemplazar la política pública para que no devuelva los hacks ocultos
DROP POLICY IF EXISTS "Public can view approved hacks." ON "public"."hacks";
CREATE POLICY "Public can view approved hacks." 
  ON "public"."hacks" 
  FOR SELECT 
  USING (approved = true AND is_hidden = false);