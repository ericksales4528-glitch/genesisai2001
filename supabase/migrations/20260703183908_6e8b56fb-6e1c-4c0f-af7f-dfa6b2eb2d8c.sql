DROP POLICY IF EXISTS "Allow all access to sites" ON public.sites;

CREATE POLICY "Public can read sites"
ON public.sites FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can create sites"
ON public.sites FOR INSERT
TO public
WITH CHECK (true);

-- No UPDATE or DELETE policies: writes of that kind are blocked for anon/public.
-- service_role bypasses RLS and can still perform admin operations via edge functions.