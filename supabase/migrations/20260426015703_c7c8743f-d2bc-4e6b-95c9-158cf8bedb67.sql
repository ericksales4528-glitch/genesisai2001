ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS html_content TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS sites_slug_unique ON public.sites (slug) WHERE slug IS NOT NULL;