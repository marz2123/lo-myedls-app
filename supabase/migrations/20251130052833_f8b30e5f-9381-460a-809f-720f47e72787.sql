-- Create table for external building analysis results
CREATE TABLE public.external_building_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.property_enrichment_snapshots(id) ON DELETE CASCADE,
  analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  images_analyzed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for faster lookups
CREATE INDEX idx_external_building_analysis_project_id ON public.external_building_analysis(project_id);
CREATE INDEX idx_external_building_analysis_snapshot_id ON public.external_building_analysis(snapshot_id);

-- Enable RLS
ALTER TABLE public.external_building_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view analysis for their projects
CREATE POLICY "Users can view analysis for their projects"
ON public.external_building_analysis
FOR SELECT
USING (
  project_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = external_building_analysis.project_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policy: Users can insert analysis for their projects
CREATE POLICY "Users can insert analysis for their projects"
ON public.external_building_analysis
FOR INSERT
WITH CHECK (
  project_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = external_building_analysis.project_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policy: Users can update analysis for their projects
CREATE POLICY "Users can update analysis for their projects"
ON public.external_building_analysis
FOR UPDATE
USING (
  project_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = external_building_analysis.project_id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policy: Service can insert analysis (for edge functions)
CREATE POLICY "Service can insert analysis"
ON public.external_building_analysis
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_external_building_analysis_updated_at
BEFORE UPDATE ON public.external_building_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();