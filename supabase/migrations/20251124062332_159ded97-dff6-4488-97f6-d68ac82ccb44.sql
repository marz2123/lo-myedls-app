-- Create storage bucket for user logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-logos', 'user-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow users to upload their own logo
CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to view all logos (public bucket)
CREATE POLICY "Anyone can view user logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-logos');

-- Create policy to allow users to update their own logo
CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to delete their own logo
CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);