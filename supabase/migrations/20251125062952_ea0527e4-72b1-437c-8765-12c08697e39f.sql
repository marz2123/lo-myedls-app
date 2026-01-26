-- Table pour les stratégies de prédiction A/B
CREATE TABLE IF NOT EXISTS public.prediction_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  strategy_config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour assigner les stratégies aux utilisateurs
CREATE TABLE IF NOT EXISTS public.user_prediction_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.prediction_strategies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Table pour les métriques par stratégie
CREATE TABLE IF NOT EXISTS public.strategy_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES public.prediction_strategies(id) ON DELETE CASCADE,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  accepted_predictions INTEGER NOT NULL DEFAULT 0,
  avg_confidence NUMERIC,
  avg_time_to_decision NUMERIC,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prediction_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prediction_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for prediction_strategies
CREATE POLICY "Anyone can view active strategies"
  ON public.prediction_strategies
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage strategies"
  ON public.prediction_strategies
  FOR ALL
  USING (true);

-- RLS policies for user_prediction_assignments
CREATE POLICY "Users can view their own assignment"
  ON public.user_prediction_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage assignments"
  ON public.user_prediction_assignments
  FOR ALL
  USING (true);

-- RLS policies for strategy_performance_metrics
CREATE POLICY "Anyone can view metrics"
  ON public.strategy_performance_metrics
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage metrics"
  ON public.strategy_performance_metrics
  FOR ALL
  USING (true);

-- Create default strategies
INSERT INTO public.prediction_strategies (name, description, strategy_config) VALUES
(
  'Baseline',
  'Stratégie de base utilisant uniquement l''historique utilisateur',
  '{
    "useUserHistory": true,
    "useSimilarProjects": false,
    "useFeedbackLearning": false,
    "confidenceThreshold": 60,
    "maxSuggestions": 5
  }'::jsonb
),
(
  'Enhanced',
  'Stratégie enrichie avec projets similaires et apprentissage',
  '{
    "useUserHistory": true,
    "useSimilarProjects": true,
    "useFeedbackLearning": true,
    "confidenceThreshold": 70,
    "maxSuggestions": 8
  }'::jsonb
),
(
  'Aggressive',
  'Stratégie agressive avec seuil de confiance plus bas',
  '{
    "useUserHistory": true,
    "useSimilarProjects": true,
    "useFeedbackLearning": true,
    "confidenceThreshold": 50,
    "maxSuggestions": 10
  }'::jsonb
);

-- Initialize metrics for each strategy
INSERT INTO public.strategy_performance_metrics (strategy_id)
SELECT id FROM public.prediction_strategies;

-- Index pour améliorer les performances
CREATE INDEX idx_user_prediction_assignments_user ON public.user_prediction_assignments(user_id);
CREATE INDEX idx_user_prediction_assignments_strategy ON public.user_prediction_assignments(strategy_id);
CREATE INDEX idx_strategy_performance_metrics_strategy ON public.strategy_performance_metrics(strategy_id);