
-- Add user_id column to sites table
ALTER TABLE public.sites ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policy
DROP POLICY IF EXISTS "Allow all access to sites" ON public.sites;

-- Users can only see their own sites
CREATE POLICY "Users can view own sites" ON public.sites FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own sites
CREATE POLICY "Users can insert own sites" ON public.sites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own sites
CREATE POLICY "Users can update own sites" ON public.sites FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sites
CREATE POLICY "Users can delete own sites" ON public.sites FOR DELETE TO authenticated USING (auth.uid() = user_id);
