-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-pdfs', 'project-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for PDF bucket
CREATE POLICY "Users can view their own project PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own project PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own project PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add pdf_files column to projects table to track uploaded PDFs
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS pdf_files JSONB DEFAULT '[]'::jsonb;