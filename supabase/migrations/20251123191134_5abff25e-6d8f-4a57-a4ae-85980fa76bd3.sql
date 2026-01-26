-- Add column to track last used custom template
ALTER TABLE public.projects
ADD COLUMN last_used_template_id UUID REFERENCES public.custom_templates(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_projects_last_template ON public.projects(last_used_template_id);