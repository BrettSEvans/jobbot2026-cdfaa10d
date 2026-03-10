
-- Shared blocked-scrape-sites table (all authenticated users benefit)
CREATE TABLE public.blocked_scrape_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname text UNIQUE NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  last_confirmed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_scrape_sites ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read blocked sites"
  ON public.blocked_scrape_sites FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert (discover new blocked sites)
CREATE POLICY "Authenticated users can insert blocked sites"
  ON public.blocked_scrape_sites FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can delete (unblock after successful recheck)
CREATE POLICY "Authenticated users can delete blocked sites"
  ON public.blocked_scrape_sites FOR DELETE
  TO authenticated
  USING (true);

-- Update last_confirmed_at on re-discovery
CREATE POLICY "Authenticated users can update blocked sites"
  ON public.blocked_scrape_sites FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
