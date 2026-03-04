
-- Add soft-delete column
ALTER TABLE public.resume_prompt_styles
  ADD COLUMN deleted_at timestamptz NULL DEFAULT NULL;

-- Update public read policy to exclude soft-deleted styles
DROP POLICY IF EXISTS "Anyone can read active styles" ON public.resume_prompt_styles;
CREATE POLICY "Anyone can read active styles"
  ON public.resume_prompt_styles
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);
