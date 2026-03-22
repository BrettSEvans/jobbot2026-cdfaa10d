-- Reset all cached best practices so they regenerate with the new one-page rubric format
UPDATE public.asset_best_practices 
SET updated_at = '2020-01-01T00:00:00Z'::timestamptz;