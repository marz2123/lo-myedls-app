
-- Create table for voice commands during live narration
CREATE TABLE public.edl_voice_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  edl_id UUID REFERENCES public.edls(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  room_id TEXT,
  audio_url TEXT,
  transcription TEXT,
  intent TEXT NOT NULL,
  executed_action JSONB,
  confidence_score NUMERIC(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for live narration sessions
CREATE TABLE public.edl_livenarration_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  duration_seconds INTEGER,
  total_commands INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  total_anomalies_detected INTEGER DEFAULT 0,
  total_tasks_generated INTEGER DEFAULT 0,
  rooms_visited JSONB DEFAULT '[]'::jsonb,
  auto_actions JSONB DEFAULT '[]'::jsonb,
  results_json JSONB,
  autostory_video_id UUID REFERENCES public.autostory_videos(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edl_voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_livenarration_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice commands
CREATE POLICY "Users can view their own voice commands"
  ON public.edl_voice_commands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice commands"
  ON public.edl_voice_commands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON public.edl_livenarration_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.edl_livenarration_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.edl_livenarration_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_voice_commands_session ON public.edl_voice_commands(session_id);
CREATE INDEX idx_voice_commands_edl ON public.edl_voice_commands(edl_id);
CREATE INDEX idx_livenarration_project ON public.edl_livenarration_sessions(project_id);
CREATE INDEX idx_livenarration_user ON public.edl_livenarration_sessions(user_id);
