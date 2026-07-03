
DROP POLICY IF EXISTS "Users can view own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can insert own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can update own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can delete own sites" ON public.sites;

ALTER TABLE public.sites DROP COLUMN IF EXISTS user_id;

CREATE POLICY "Allow all access to sites" ON public.sites FOR ALL TO public USING (true) WITH CHECK (true);
