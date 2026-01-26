-- Table pour les signatures électroniques
CREATE TABLE IF NOT EXISTS public.edl_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_session_id UUID NOT NULL REFERENCES public.visit_sessions(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('inspector', 'client')),
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les commentaires clients sur les tâches
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.extracted_tasks(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('inspector', 'client')),
  author_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour l'historique des versions de projets
CREATE TABLE IF NOT EXISTS public.project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL, -- Complete project snapshot
  change_description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour le cache intelligent
CREATE TABLE IF NOT EXISTS public.cache_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prediction_type TEXT NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2),
  cache_key TEXT NOT NULL UNIQUE,
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les anomalies détectées
CREATE TABLE IF NOT EXISTS public.detected_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  visit_session_id UUID REFERENCES public.visit_sessions(id) ON DELETE CASCADE,
  frame_id UUID REFERENCES public.extracted_frames(id) ON DELETE SET NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('crack_evolution', 'recurring_infiltration', 'structural_concern', 'material_degradation')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  detection_metadata JSONB,
  location_data JSONB,
  confidence_score NUMERIC(3,2),
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les recommandations prédictives
CREATE TABLE IF NOT EXISTS public.task_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recommended_task_title TEXT NOT NULL,
  recommended_task_description TEXT,
  recommendation_reason TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  based_on_task_ids UUID[],
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  estimated_cost_range JSONB,
  is_accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour l'historique des conversations MyAladin enrichies
CREATE TABLE IF NOT EXISTS public.myaladin_expertise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.myaladin_conversations(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL CHECK (query_type IN ('technical_advice', 'cost_estimation', 'regulation_check', 'material_suggestion', 'planning_help')),
  query_context JSONB NOT NULL,
  response_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2),
  user_feedback TEXT CHECK (user_feedback IN ('helpful', 'neutral', 'not_helpful')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX idx_edl_signatures_visit ON public.edl_signatures(visit_session_id);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_created ON public.task_comments(created_at DESC);
CREATE INDEX idx_project_versions_project ON public.project_versions(project_id, version_number DESC);
CREATE INDEX idx_cache_predictions_key ON public.cache_predictions(cache_key);
CREATE INDEX idx_cache_predictions_expires ON public.cache_predictions(expires_at);
CREATE INDEX idx_detected_anomalies_project ON public.detected_anomalies(project_id);
CREATE INDEX idx_detected_anomalies_severity ON public.detected_anomalies(severity);
CREATE INDEX idx_task_recommendations_project ON public.task_recommendations(project_id);
CREATE INDEX idx_myaladin_expertise_conversation ON public.myaladin_expertise_logs(conversation_id);

-- Enable RLS
ALTER TABLE public.edl_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.myaladin_expertise_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view signatures for their visits"
  ON public.edl_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.visit_sessions vs
      WHERE vs.id = edl_signatures.visit_session_id
      AND vs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create signatures"
  ON public.edl_signatures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view comments on their tasks"
  ON public.task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.extracted_tasks t
      WHERE t.id = task_comments.task_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own comments"
  ON public.task_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.extracted_tasks t
      WHERE t.id = task_comments.task_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their project versions"
  ON public.project_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_versions.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create project versions"
  ON public.project_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_versions.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their cache predictions"
  ON public.cache_predictions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create cache predictions"
  ON public.cache_predictions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their cache predictions"
  ON public.cache_predictions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view anomalies for their projects"
  ON public.detected_anomalies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = detected_anomalies.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create anomalies"
  ON public.detected_anomalies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update anomalies for their projects"
  ON public.detected_anomalies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = detected_anomalies.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view recommendations for their projects"
  ON public.task_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = task_recommendations.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create recommendations"
  ON public.task_recommendations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update recommendations for their projects"
  ON public.task_recommendations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = task_recommendations.project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their MyAladin expertise logs"
  ON public.myaladin_expertise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.myaladin_conversations c
      WHERE c.id = myaladin_expertise_logs.conversation_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create expertise logs"
  ON public.myaladin_expertise_logs FOR INSERT
  WITH CHECK (true);

-- Trigger for task_comments updated_at
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();