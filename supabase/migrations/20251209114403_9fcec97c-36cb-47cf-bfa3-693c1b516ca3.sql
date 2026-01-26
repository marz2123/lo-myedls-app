-- Create EDL quality scores table
CREATE TABLE public.edl_quality_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  completeness_score NUMERIC DEFAULT 0,
  ai_coherence_score NUMERIC DEFAULT 0,
  technical_coherence_score NUMERIC DEFAULT 0,
  entry_exit_coherence_score NUMERIC DEFAULT 0,
  writing_quality_score NUMERIC DEFAULT 0,
  photo_quality_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('excellent', 'very_good', 'average', 'needs_review', 'pending')),
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  analysis_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create EDL quality metrics per room/element
CREATE TABLE public.edl_quality_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quality_score_id UUID NOT NULL REFERENCES public.edl_quality_scores(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('room', 'element')),
  name TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  photos_valid_percent NUMERIC DEFAULT 0,
  descriptions_valid_percent NUMERIC DEFAULT 0,
  anomalies_validated_percent NUMERIC DEFAULT 0,
  tasks_correct_percent NUMERIC DEFAULT 0,
  items_completed_percent NUMERIC DEFAULT 0,
  issues JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create EDL quality recommendations
CREATE TABLE public.edl_quality_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quality_score_id UUID NOT NULL REFERENCES public.edl_quality_scores(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('correction', 'reformulation', 'missing_task', 'missing_photo', 'coherence', 'description', 'rescan')),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('critical', 'important', 'minor')),
  title TEXT NOT NULL,
  description TEXT,
  affected_item_id UUID,
  affected_item_type TEXT,
  action_data JSONB DEFAULT '{}',
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create EDL systemic errors table
CREATE TABLE public.edl_systemic_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  error_pattern TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('critical', 'important', 'minor')),
  description TEXT NOT NULL,
  examples JSONB DEFAULT '[]',
  first_detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edl_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_quality_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_systemic_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for edl_quality_scores
CREATE POLICY "Users can view quality scores for their projects"
  ON public.edl_quality_scores FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = edl_quality_scores.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage quality scores for their projects"
  ON public.edl_quality_scores FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = edl_quality_scores.project_id AND p.user_id = auth.uid()
  ));

-- RLS Policies for edl_quality_metrics
CREATE POLICY "Users can view quality metrics for their projects"
  ON public.edl_quality_metrics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = edl_quality_metrics.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage quality metrics for their projects"
  ON public.edl_quality_metrics FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = edl_quality_metrics.project_id AND p.user_id = auth.uid()
  ));

-- RLS Policies for edl_quality_recommendations
CREATE POLICY "Users can view recommendations for their projects"
  ON public.edl_quality_recommendations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = edl_quality_recommendations.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage recommendations for their projects"
  ON public.edl_quality_recommendations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = edl_quality_recommendations.project_id AND p.user_id = auth.uid()
  ));

-- RLS Policies for edl_systemic_errors
CREATE POLICY "Users can view their own systemic errors"
  ON public.edl_systemic_errors FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own systemic errors"
  ON public.edl_systemic_errors FOR ALL
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_quality_scores_project ON public.edl_quality_scores(project_id);
CREATE INDEX idx_quality_metrics_score ON public.edl_quality_metrics(quality_score_id);
CREATE INDEX idx_quality_recommendations_score ON public.edl_quality_recommendations(quality_score_id);
CREATE INDEX idx_systemic_errors_user ON public.edl_systemic_errors(user_id);