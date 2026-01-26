-- Create storage bucket for task images
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-images', 'task-images', true);

-- Storage policies for task images
CREATE POLICY "Task images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-images');

CREATE POLICY "Anyone can upload task images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-images');

CREATE POLICY "Anyone can update task images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'task-images');

CREATE POLICY "Anyone can delete task images"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-images');

-- Add image_url column to extracted_tasks
ALTER TABLE extracted_tasks
ADD COLUMN image_url text;