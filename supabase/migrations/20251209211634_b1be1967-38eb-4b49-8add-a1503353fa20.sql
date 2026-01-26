
-- Table for storing multi-agent analysis results
CREATE TABLE public.multiagent_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
  frame_id UUID REFERENCES public.extracted_frames(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES public.visit_sequences(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('vision', 'description', 'task', 'normes', 'coherence', 'quality', 'comparative', 'planning', 'autopilot', 'orchestrator')),
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'invalidated')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing multi-agent conflict resolutions
CREATE TABLE public.multiagent_resolutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  analysis_ids UUID[] NOT NULL,
  inconsistency_type TEXT NOT NULL CHECK (inconsistency_type IN ('vision_description', 'description_task', 'anomaly_task', 'entry_exit', 'state_anomaly', 'photo_element', 'norm_violation', 'hallucination', 'redundancy', 'other')),
  conflicting_agents TEXT[] NOT NULL,
  conflict_description TEXT,
  chosen_agent TEXT,
  resolution_type TEXT NOT NULL CHECK (resolution_type IN ('auto_corrected', 'merged', 'user_validated', 'rejected', 'pending')),
  resolution_data JSONB DEFAULT '{}'::jsonb,
  confidence NUMERIC DEFAULT 0,
  applied_at TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing orchestrator sessions
CREATE TABLE public.multiagent_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('photo', 'video', 'sequence', 'manual', 'autopilot', 'batch')),
  trigger_item_id UUID,
  status TEXT NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'running', 'merging', 'resolving', 'completed', 'failed')),
  agents_triggered TEXT[] DEFAULT '{}',
  agents_completed TEXT[] DEFAULT '{}',
  total_analyses INTEGER DEFAULT 0,
  total_resolutions INTEGER DEFAULT 0,
  overall_confidence NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  coherence_score NUMERIC DEFAULT 0,
  completeness_score NUMERIC DEFAULT 0,
  final_result JSONB DEFAULT '{}'::jsonb,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.multiagent_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiagent_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiagent_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multiagent_analysis
CREATE POLICY "Users can view their own analyses" ON public.multiagent_analysis
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own analyses" ON public.multiagent_analysis
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own analyses" ON public.multiagent_analysis
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own analyses" ON public.multiagent_analysis
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for multiagent_resolutions
CREATE POLICY "Users can view their own resolutions" ON public.multiagent_resolutions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own resolutions" ON public.multiagent_resolutions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own resolutions" ON public.multiagent_resolutions
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for multiagent_sessions
CREATE POLICY "Users can view their own sessions" ON public.multiagent_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions" ON public.multiagent_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.multiagent_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_multiagent_analysis_project ON public.multiagent_analysis(project_id);
CREATE INDEX idx_multiagent_analysis_agent ON public.multiagent_analysis(agent_name);
CREATE INDEX idx_multiagent_analysis_status ON public.multiagent_analysis(status);
CREATE INDEX idx_multiagent_resolutions_project ON public.multiagent_resolutions(project_id);
CREATE INDEX idx_multiagent_sessions_project ON public.multiagent_sessions(project_id);
CREATE INDEX idx_multiagent_sessions_status ON public.multiagent_sessions(status);

-- Trigger for updated_at
CREATE TRIGGER update_multiagent_analysis_updated_at
  BEFORE UPDATE ON public.multiagent_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_multiagent_sessions_updated_at
  BEFORE UPDATE ON public.multiagent_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
