
-- Create generation usage tracking table
CREATE TABLE public.generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_type text NOT NULL,
  edge_function text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient rate limit queries
CREATE INDEX idx_generation_usage_user_created ON public.generation_usage (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.generation_usage ENABLE ROW LEVEL SECURITY;

-- Users can insert own usage
CREATE POLICY "Users can insert own usage"
  ON public.generation_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view own usage
CREATE POLICY "Users can view own usage"
  ON public.generation_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all usage
CREATE POLICY "Admins can view all usage"
  ON public.generation_usage
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
