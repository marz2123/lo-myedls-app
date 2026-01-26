-- Create storage bucket for 3D models
INSERT INTO storage.buckets (id, name, public)
VALUES ('3d-models', '3d-models', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for 3D models bucket
CREATE POLICY "Users can view 3D models"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = '3d-models');

CREATE POLICY "Users can upload their own 3D models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = '3d-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own 3D models"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = '3d-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own 3D models"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = '3d-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add 3D model URLs to detected_blocks table
ALTER TABLE public.detected_blocks
ADD COLUMN IF NOT EXISTS model_3d_urls JSONB DEFAULT NULL;

COMMENT ON COLUMN public.detected_blocks.model_3d_urls IS 'URLs for 3D models in different formats: { "obj": "url", "usdz": "url", "glb": "url" }';