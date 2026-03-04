
CREATE TABLE public.user_style_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  preference text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  times_reinforced integer NOT NULL DEFAULT 1,
  source_quote text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_style_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own style preferences"
  ON public.user_style_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
