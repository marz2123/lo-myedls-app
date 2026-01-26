-- Make task-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'task-images';

-- Add user_id column to extracted_tasks table for ownership tracking
ALTER TABLE public.extracted_tasks 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance on user queries
CREATE INDEX IF NOT EXISTS idx_extracted_tasks_user_id ON public.extracted_tasks(user_id);

-- Update RLS policies for extracted_tasks to check user ownership
DROP POLICY IF EXISTS "Anyone can delete extracted tasks" ON public.extracted_tasks;
DROP POLICY IF EXISTS "Anyone can insert extracted tasks" ON public.extracted_tasks;
DROP POLICY IF EXISTS "Anyone can update extracted tasks" ON public.extracted_tasks;
DROP POLICY IF EXISTS "Extracted tasks are viewable by everyone" ON public.extracted_tasks;

-- New RLS policies with user ownership checks
CREATE POLICY "Users can view their own tasks"
ON public.extracted_tasks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
ON public.extracted_tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.extracted_tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.extracted_tasks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS policies for storage.objects (task-images bucket)
CREATE POLICY "Users can view their own task images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own task images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own task images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own task images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);