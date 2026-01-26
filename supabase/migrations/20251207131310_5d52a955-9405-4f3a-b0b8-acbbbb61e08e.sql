
-- Add clientASL to existing app_role enum if not present
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clientASL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create project_client_access table to link clients to specific projects
CREATE TABLE IF NOT EXISTS public.project_client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  access_type TEXT NOT NULL DEFAULT 'read',
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_client_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_client_access
CREATE POLICY "Users can view their own project access"
ON public.project_client_access
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage project access"
ON public.project_client_access
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create client_questions table for Q&A history
CREATE TABLE IF NOT EXISTS public.client_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_questions
CREATE POLICY "Users can view their own questions"
ON public.client_questions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own questions"
ON public.client_questions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add RLS policy for clients to view projects they have access to
CREATE POLICY "Clients can view projects they have access to"
ON public.projects
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.project_client_access pca 
    WHERE pca.project_id = projects.id 
    AND pca.user_id = auth.uid()
  )
);
