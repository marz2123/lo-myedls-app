-- Créer les buckets de stockage pour les visites
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('visit-videos', 'visit-videos', false, 524288000, ARRAY['video/mp4', 'video/webm', 'video/quicktime']), -- 500MB limit
  ('visit-frames', 'visit-frames', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg']), -- 10MB limit
  ('visit-audio', 'visit-audio', false, 52428800, ARRAY['audio/mp3', 'audio/webm', 'audio/wav', 'audio/mpeg']) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- Politiques de stockage pour visit-videos
CREATE POLICY "Users can upload their own visit videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visit-videos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own visit videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visit-videos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own visit videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visit-videos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politiques de stockage pour visit-frames
CREATE POLICY "Users can upload their own visit frames"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visit-frames' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own visit frames"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visit-frames' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own visit frames"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visit-frames' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politiques de stockage pour visit-audio
CREATE POLICY "Users can upload their own visit audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visit-audio' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own visit audio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visit-audio' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own visit audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visit-audio' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);