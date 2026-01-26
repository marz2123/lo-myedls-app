-- Add archived column to projects table
ALTER TABLE public.projects 
ADD COLUMN archived boolean DEFAULT false NOT NULL;