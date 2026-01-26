-- Create daily logs table for chantier tracking
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT,
  weather_data JSONB DEFAULT '{}',
  companies_present TEXT[] DEFAULT '{}',
  tasks_completed TEXT[] DEFAULT '{}',
  observations TEXT,
  problems_encountered TEXT,
  urgent_needs TEXT,
  photo_urls JSONB DEFAULT '[]',
  ai_summary TEXT,
  ai_risks TEXT,
  ai_suggestions TEXT,
  is_validated BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, log_date)
);

-- Add task assignment fields to problem_tasks
ALTER TABLE public.problem_tasks 
ADD COLUMN IF NOT EXISTS assigned_to UUID,
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_to_role TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create task photos table
CREATE TABLE IF NOT EXISTS public.task_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'problem_task',
  image_url TEXT NOT NULL,
  comment TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_logs
CREATE POLICY "Users can manage daily logs for their projects"
ON public.daily_logs
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = daily_logs.project_id AND p.user_id = auth.uid()
));

-- RLS policies for task_photos
CREATE POLICY "Users can manage task photos"
ON public.task_photos
FOR ALL
USING (uploaded_by = auth.uid());

CREATE POLICY "Users can view task photos for their projects"
ON public.task_photos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM problem_tasks pt
  JOIN projects p ON p.id = pt.project_id
  WHERE pt.id = task_photos.task_id AND p.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_daily_logs_updated_at
BEFORE UPDATE ON public.daily_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();