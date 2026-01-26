-- Add location field to extracted_tasks table
ALTER TABLE public.extracted_tasks 
ADD COLUMN location text;

-- Add index for location queries
CREATE INDEX idx_extracted_tasks_location ON public.extracted_tasks(location);