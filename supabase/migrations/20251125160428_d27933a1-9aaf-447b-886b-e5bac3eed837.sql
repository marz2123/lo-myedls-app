-- Create storage bucket for custom floor plans
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'floor-plans',
  'floor-plans',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for floor plans
CREATE POLICY "Users can upload their own floor plans"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'floor-plans' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own floor plans"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'floor-plans' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own floor plans"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'floor-plans' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);