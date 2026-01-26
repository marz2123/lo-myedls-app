-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for project documents bucket
CREATE POLICY "Users can upload their project documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their project documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their project documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add project_documents JSONB column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_documents JSONB DEFAULT '[]'::jsonb;