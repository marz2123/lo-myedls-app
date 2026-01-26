-- Add template_data column to store structured template information
ALTER TABLE public.projects
ADD COLUMN template_data JSONB DEFAULT '{}'::jsonb;