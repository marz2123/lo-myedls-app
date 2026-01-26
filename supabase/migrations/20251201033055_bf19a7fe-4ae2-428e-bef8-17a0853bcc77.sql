-- Create table for AI-generated tasks from problems
CREATE TABLE public.generated_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.identified_problems(id) ON DELETE CASCADE,
  tasks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC DEFAULT 0,
  model_used TEXT DEFAULT 'google/gemini-2.5-flash',
  context_used JSONB DEFAULT '{}'::jsonb,
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view generated tasks for their projects"
ON public.generated_tasks
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = generated_tasks.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create generated tasks for their projects"
ON public.generated_tasks
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = generated_tasks.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update generated tasks for their projects"
ON public.generated_tasks
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = generated_tasks.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete generated tasks for their projects"
ON public.generated_tasks
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = generated_tasks.project_id AND p.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_generated_tasks_updated_at
BEFORE UPDATE ON public.generated_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_generated_tasks_problem_id ON public.generated_tasks(problem_id);
CREATE INDEX idx_generated_tasks_project_id ON public.generated_tasks(project_id);