-- Create storage bucket for zone media
INSERT INTO storage.buckets (id, name, public)
VALUES ('zone-media', 'zone-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to zone-media bucket
CREATE POLICY "Users can upload zone media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'zone-media' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view all zone media (public bucket)
CREATE POLICY "Zone media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'zone-media');

-- Allow users to delete their own zone media
CREATE POLICY "Users can delete their zone media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'zone-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add zone_id column to visit_sequences if not exists
ALTER TABLE public.visit_sequences 
ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.location_zones(id);

-- Add zone_type column for quick filtering
ALTER TABLE public.visit_sequences 
ADD COLUMN IF NOT EXISTS zone_type text;

-- Add description column for text input
ALTER TABLE public.visit_sequences 
ADD COLUMN IF NOT EXISTS description text;