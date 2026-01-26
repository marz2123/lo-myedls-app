-- Create table for exterior work estimations
CREATE TABLE public.exterior_work_estimations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.property_enrichment_snapshots(id) ON DELETE SET NULL,
  external_analysis_id UUID REFERENCES public.external_building_analysis(id) ON DELETE SET NULL,
  estimation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  global_budget_min NUMERIC,
  global_budget_max NUMERIC,
  complexity_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exterior_work_estimations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view estimations for their projects"
  ON public.exterior_work_estimations
  FOR SELECT
  USING (
    (project_id IS NULL) OR 
    (EXISTS (SELECT 1 FROM projects p WHERE p.id = exterior_work_estimations.project_id AND p.user_id = auth.uid()))
  );

CREATE POLICY "Users can insert estimations for their projects"
  ON public.exterior_work_estimations
  FOR INSERT
  WITH CHECK (
    (project_id IS NULL) OR 
    (EXISTS (SELECT 1 FROM projects p WHERE p.id = exterior_work_estimations.project_id AND p.user_id = auth.uid()))
  );

CREATE POLICY "Users can update estimations for their projects"
  ON public.exterior_work_estimations
  FOR UPDATE
  USING (
    (project_id IS NULL) OR 
    (EXISTS (SELECT 1 FROM projects p WHERE p.id = exterior_work_estimations.project_id AND p.user_id = auth.uid()))
  );

CREATE POLICY "Service can insert estimations"
  ON public.exterior_work_estimations
  FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_exterior_work_estimations_updated_at
  BEFORE UPDATE ON public.exterior_work_estimations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();