-- Create import_progress table for tracking taxonomy imports
CREATE TABLE IF NOT EXISTS public.import_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  families_count INTEGER DEFAULT 0,
  categories_count INTEGER DEFAULT 0,
  subcategories_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own import progress
CREATE POLICY "Users can view their own import progress"
  ON public.import_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own import progress
CREATE POLICY "Users can insert their own import progress"
  ON public.import_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for import_progress table
ALTER TABLE public.import_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_progress;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_import_progress_user_id ON public.import_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_import_progress_status ON public.import_progress(status);