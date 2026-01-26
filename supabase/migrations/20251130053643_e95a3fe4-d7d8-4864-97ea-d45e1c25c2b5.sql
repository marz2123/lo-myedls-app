-- Create table for exterior FT/CT/ST tasks mapping
CREATE TABLE public.exterior_ft_ct_st_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimation_id UUID REFERENCES public.exterior_work_estimations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  work_quantity TEXT,
  work_unit TEXT,
  cost_min NUMERIC,
  cost_max NUMERIC,
  priority TEXT,
  reason TEXT,
  ft_family TEXT NOT NULL,
  ct_category TEXT NOT NULL,
  st_subcategory TEXT NOT NULL,
  description TEXT,
  dependencies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exterior_ft_ct_st_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view tasks for their projects"
ON public.exterior_ft_ct_st_tasks
FOR SELECT
USING (
  (project_id IS NULL) OR 
  (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = exterior_ft_ct_st_tasks.project_id
    AND p.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can insert tasks for their projects"
ON public.exterior_ft_ct_st_tasks
FOR INSERT
WITH CHECK (
  (project_id IS NULL) OR 
  (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = exterior_ft_ct_st_tasks.project_id
    AND p.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update tasks for their projects"
ON public.exterior_ft_ct_st_tasks
FOR UPDATE
USING (
  (project_id IS NULL) OR 
  (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = exterior_ft_ct_st_tasks.project_id
    AND p.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete tasks for their projects"
ON public.exterior_ft_ct_st_tasks
FOR DELETE
USING (
  (project_id IS NULL) OR 
  (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = exterior_ft_ct_st_tasks.project_id
    AND p.user_id = auth.uid()
  ))
);

CREATE POLICY "Service can insert tasks"
ON public.exterior_ft_ct_st_tasks
FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_exterior_ft_ct_st_tasks_updated_at
BEFORE UPDATE ON public.exterior_ft_ct_st_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();