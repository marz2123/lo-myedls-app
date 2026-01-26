
-- Deep Analysis Results table
CREATE TABLE public.deep_analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
  overall_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  photo_description_score INTEGER DEFAULT 0,
  entry_exit_score INTEGER DEFAULT 0,
  state_anomaly_score INTEGER DEFAULT 0,
  writing_quality_score INTEGER DEFAULT 0,
  photo_coverage_score INTEGER DEFAULT 0,
  analysis_summary TEXT,
  total_inconsistencies INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0,
  auto_corrections_available INTEGER DEFAULT 0,
  auto_corrections_applied INTEGER DEFAULT 0,
  analysis_metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inconsistency Items table
CREATE TABLE public.inconsistency_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.deep_analysis_results(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  inconsistency_type TEXT NOT NULL CHECK (inconsistency_type IN (
    'photo_description_mismatch',
    'state_anomaly_conflict',
    'entry_exit_contradiction',
    'writing_error',
    'forbidden_term',
    'missing_photo',
    'duplicate_photo',
    'blurry_photo',
    'wrong_room_photo',
    'vague_description',
    'incomplete_item',
    'ai_error',
    'topological_error',
    'missing_angle',
    'legal_risk'
  )),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  category TEXT NOT NULL CHECK (category IN (
    'photo_analysis',
    'semantic_analysis',
    'state_coherence',
    'entry_exit',
    'writing_quality',
    'coverage',
    'legal',
    'ai_detection'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_context JSONB DEFAULT '{}'::jsonb,
  affected_item_id UUID,
  affected_item_type TEXT,
  photo_url TEXT,
  original_text TEXT,
  suggested_correction TEXT,
  auto_correctable BOOLEAN DEFAULT false,
  is_corrected BOOLEAN DEFAULT false,
  corrected_at TIMESTAMP WITH TIME ZONE,
  corrected_by UUID,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID,
  confidence_score NUMERIC DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_deep_analysis_project ON public.deep_analysis_results(project_id);
CREATE INDEX idx_deep_analysis_status ON public.deep_analysis_results(status);
CREATE INDEX idx_inconsistency_analysis ON public.inconsistency_items(analysis_id);
CREATE INDEX idx_inconsistency_project ON public.inconsistency_items(project_id);
CREATE INDEX idx_inconsistency_type ON public.inconsistency_items(inconsistency_type);
CREATE INDEX idx_inconsistency_severity ON public.inconsistency_items(severity);

-- Enable RLS
ALTER TABLE public.deep_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inconsistency_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deep_analysis_results
CREATE POLICY "Users can view their own analysis results"
ON public.deep_analysis_results FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create analysis for their projects"
ON public.deep_analysis_results FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update their own analysis"
ON public.deep_analysis_results FOR UPDATE
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own analysis"
ON public.deep_analysis_results FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for inconsistency_items
CREATE POLICY "Users can view inconsistencies for their projects"
ON public.inconsistency_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create inconsistencies for their projects"
ON public.inconsistency_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update inconsistencies for their projects"
ON public.inconsistency_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete inconsistencies for their projects"
ON public.inconsistency_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_deep_analysis_results_updated_at
BEFORE UPDATE ON public.deep_analysis_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
