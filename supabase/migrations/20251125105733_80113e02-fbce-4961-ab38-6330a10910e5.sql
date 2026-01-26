-- Add task_count column to import_progress table
ALTER TABLE public.import_progress 
ADD COLUMN IF NOT EXISTS tasks_count integer DEFAULT 0;