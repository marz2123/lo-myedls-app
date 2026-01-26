
-- Autopilot Sessions - Main session tracking
CREATE TABLE public.autopilot_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'analyzing', 'generating', 'ready', 'validated', 'error')),
  video_url TEXT,
  duration_seconds INTEGER,
  total_rooms_detected INTEGER DEFAULT 0,
  total_elements_detected INTEGER DEFAULT 0,
  total_anomalies_detected INTEGER DEFAULT 0,
  total_tasks_generated INTEGER DEFAULT 0,
  total_photos_extracted INTEGER DEFAULT 0,
  overall_confidence_score NUMERIC(5,2) DEFAULT 0,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  analysis_metadata JSONB DEFAULT '{}',
  edl_report_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Autopilot Segments - Detected room segments from video
CREATE TABLE public.autopilot_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.autopilot_sessions(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  room_type TEXT NOT NULL,
  room_label TEXT,
  start_time_seconds NUMERIC(10,2) NOT NULL,
  end_time_seconds NUMERIC(10,2) NOT NULL,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  preview_frame_url TEXT,
  elements_detected JSONB DEFAULT '[]',
  anomalies_detected JSONB DEFAULT '[]',
  global_state TEXT CHECK (global_state IN ('neuf', 'bon', 'moyen', 'mauvais', 'a_refaire')),
  description_generated TEXT,
  tasks_generated JSONB DEFAULT '[]',
  coverage_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Autopilot Detected Items - Individual elements detected
CREATE TABLE public.autopilot_detected_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.autopilot_sessions(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.autopilot_segments(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_label TEXT NOT NULL,
  element_category TEXT,
  material_detected TEXT,
  state TEXT CHECK (state IN ('neuf', 'bon', 'moyen', 'mauvais', 'absent')),
  confidence_score NUMERIC(5,2) DEFAULT 0,
  bounding_box JSONB,
  frame_url TEXT,
  timestamp_seconds NUMERIC(10,2),
  description_generated TEXT,
  anomalies JSONB DEFAULT '[]',
  tasks JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Autopilot Confidence - Detailed confidence metrics
CREATE TABLE public.autopilot_confidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.autopilot_sessions(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  details JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.autopilot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_detected_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_confidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for autopilot_sessions
CREATE POLICY "Users can view their own autopilot sessions"
  ON public.autopilot_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own autopilot sessions"
  ON public.autopilot_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own autopilot sessions"
  ON public.autopilot_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own autopilot sessions"
  ON public.autopilot_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for autopilot_segments
CREATE POLICY "Users can view segments of their sessions"
  ON public.autopilot_segments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can create segments for their sessions"
  ON public.autopilot_segments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can update segments of their sessions"
  ON public.autopilot_segments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete segments of their sessions"
  ON public.autopilot_segments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

-- RLS Policies for autopilot_detected_items
CREATE POLICY "Users can view detected items of their sessions"
  ON public.autopilot_detected_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can create detected items for their sessions"
  ON public.autopilot_detected_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can update detected items of their sessions"
  ON public.autopilot_detected_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete detected items of their sessions"
  ON public.autopilot_detected_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

-- RLS Policies for autopilot_confidence
CREATE POLICY "Users can view confidence metrics of their sessions"
  ON public.autopilot_confidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can create confidence metrics for their sessions"
  ON public.autopilot_confidence FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.autopilot_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_autopilot_sessions_project ON public.autopilot_sessions(project_id);
CREATE INDEX idx_autopilot_sessions_user ON public.autopilot_sessions(user_id);
CREATE INDEX idx_autopilot_sessions_status ON public.autopilot_sessions(status);
CREATE INDEX idx_autopilot_segments_session ON public.autopilot_segments(session_id);
CREATE INDEX idx_autopilot_detected_items_session ON public.autopilot_detected_items(session_id);
CREATE INDEX idx_autopilot_detected_items_segment ON public.autopilot_detected_items(segment_id);
CREATE INDEX idx_autopilot_confidence_session ON public.autopilot_confidence(session_id);

-- Trigger for updated_at
CREATE TRIGGER update_autopilot_sessions_updated_at
  BEFORE UPDATE ON public.autopilot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
