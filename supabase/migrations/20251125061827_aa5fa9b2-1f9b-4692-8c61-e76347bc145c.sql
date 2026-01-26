-- Table pour stocker les retours sur les prédictions de tâches
CREATE TABLE IF NOT EXISTS public.task_prediction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  predicted_task_data JSONB NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  feedback_score NUMERIC CHECK (feedback_score >= 0 AND feedback_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_prediction_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert their own prediction feedback"
  ON public.task_prediction_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own prediction feedback"
  ON public.task_prediction_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX idx_prediction_feedback_user_accepted 
  ON public.task_prediction_feedback(user_id, accepted);

CREATE INDEX idx_prediction_feedback_project 
  ON public.task_prediction_feedback(project_id);