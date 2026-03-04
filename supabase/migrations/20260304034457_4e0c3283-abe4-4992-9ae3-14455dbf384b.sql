
-- Add profile fields for personalization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS resume_text text,
  ADD COLUMN IF NOT EXISTS years_experience text,
  ADD COLUMN IF NOT EXISTS target_industries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_tone text DEFAULT 'professional';

-- Create resume uploads storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('resume-uploads', 'resume-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can manage their own resume files
CREATE POLICY "Users can upload own resume"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resume-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own resume"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resume-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own resume"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resume-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
