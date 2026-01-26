-- Rendre les buckets visit-frames, visit-videos et visit-audio publics pour permettre l'accès aux URLs
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('visit-frames', 'visit-videos', 'visit-audio');

-- Ajouter des politiques RLS pour permettre l'upload et la lecture
CREATE POLICY "Allow authenticated users to upload visit frames"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'visit-frames');

CREATE POLICY "Allow authenticated users to upload visit videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'visit-videos');

CREATE POLICY "Allow authenticated users to upload visit audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'visit-audio');

CREATE POLICY "Allow public read access to visit frames"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'visit-frames');

CREATE POLICY "Allow public read access to visit videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'visit-videos');

CREATE POLICY "Allow public read access to visit audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'visit-audio');