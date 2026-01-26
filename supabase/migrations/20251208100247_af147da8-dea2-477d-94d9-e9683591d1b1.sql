-- Create table for storing EDL reports
CREATE TABLE public.edl_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.visit_sessions(id) ON DELETE CASCADE,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edl_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view EDL reports for their projects"
ON public.edl_reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = edl_reports.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create EDL reports for their projects"
ON public.edl_reports
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = edl_reports.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update EDL reports for their projects"
ON public.edl_reports
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = edl_reports.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete EDL reports for their projects"
ON public.edl_reports
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = edl_reports.project_id AND p.user_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_edl_reports_session ON public.edl_reports(session_id);
CREATE INDEX idx_edl_reports_project ON public.edl_reports(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_edl_reports_updated_at
BEFORE UPDATE ON public.edl_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();