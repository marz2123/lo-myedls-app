-- Table pour les sessions de visite (inspection recording sessions)
CREATE TABLE IF NOT EXISTS public.visit_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'recording', -- recording, processing, completed, failed
  video_url TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les blocs/zones détectés automatiquement
CREATE TABLE IF NOT EXISTS public.detected_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_session_id UUID NOT NULL REFERENCES public.visit_sessions(id) ON DELETE CASCADE,
  block_number INTEGER NOT NULL,
  detected_room_type TEXT, -- cuisine, sdb, chambre, couloir, plateau_brut, etc.
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  timestamp_start NUMERIC, -- seconds in video
  timestamp_end NUMERIC,
  manual_label TEXT, -- user can override AI detection
  volume_data JSONB, -- 3D volumetric data if available
  transition_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les frames clés extraits automatiquement
CREATE TABLE IF NOT EXISTS public.extracted_frames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_session_id UUID NOT NULL REFERENCES public.visit_sessions(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.detected_blocks(id) ON DELETE SET NULL,
  frame_url TEXT NOT NULL,
  timestamp_seconds NUMERIC NOT NULL,
  analysis_result JSONB, -- résultat de l'analyse GPT-4 Vision
  detected_elements JSONB, -- éléments détectés (évier, faïence, etc.)
  detected_materials JSONB,
  detected_pathologies JSONB,
  is_key_frame BOOLEAN DEFAULT true,
  transition_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Étendre la table extracted_tasks pour inclure la relation avec les blocs
ALTER TABLE public.extracted_tasks
ADD COLUMN IF NOT EXISTS visit_session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.detected_blocks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS frame_id UUID REFERENCES public.extracted_frames(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS audio_timestamp NUMERIC,
ADD COLUMN IF NOT EXISTS detection_confidence NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS analysis_metadata JSONB DEFAULT '{}'::jsonb;

-- Table pour les transcriptions audio segmentées
CREATE TABLE IF NOT EXISTS public.audio_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_session_id UUID NOT NULL REFERENCES public.visit_sessions(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.detected_blocks(id) ON DELETE SET NULL,
  transcription TEXT NOT NULL,
  timestamp_start NUMERIC NOT NULL,
  timestamp_end NUMERIC NOT NULL,
  speaker_detected TEXT,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS sur toutes les nouvelles tables
ALTER TABLE public.visit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_segments ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour visit_sessions
CREATE POLICY "Users can view their own visit sessions"
ON public.visit_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own visit sessions"
ON public.visit_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visit sessions"
ON public.visit_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visit sessions"
ON public.visit_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Politiques RLS pour detected_blocks
CREATE POLICY "Users can view blocks from their sessions"
ON public.detected_blocks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.visit_sessions
    WHERE visit_sessions.id = detected_blocks.visit_session_id
    AND visit_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create blocks in their sessions"
ON public.detected_blocks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.visit_sessions
    WHERE visit_sessions.id = detected_blocks.visit_session_id
    AND visit_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update blocks from their sessions"
ON public.detected_blocks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.visit_sessions
    WHERE visit_sessions.id = detected_blocks.visit_session_id
    AND visit_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete blocks from their sessions"
ON public.detected_blocks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.visit_sessions
    WHERE visit_sessions.id = detected_blocks.visit_session_id
    AND visit_sessions.user_id = auth.uid()
  )
);

-- Politiques RLS pour extracted_frames
CREATE POLICY "Users can view frames from their sessions"
ON public.extracted_frames FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.visit_sessions
    WHERE visit_sessions.id = extracted_frames.visit_session_id
    AND visit_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create frames in their sessions"
ON public.extracted_frames FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.visit_sessions
    WHERE visit_sessions.id = extracted_frames.visit_session_id
    AND visit_sessions.user_id = auth.uid()
  )
);

-- Politiques RLS pour audio_segments
CREATE POLICY "Users can view audio segments from their sessions"
ON public.audio_segments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.visit_sessions
    WHERE visit_sessions.id = audio_segments.visit_session_id
    AND visit_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create audio segments in their sessions"
ON public.audio_segments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.visit_sessions
    WHERE visit_sessions.id = audio_segments.visit_session_id
    AND visit_sessions.user_id = auth.uid()
  )
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_visit_sessions_updated_at
BEFORE UPDATE ON public.visit_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_detected_blocks_updated_at
BEFORE UPDATE ON public.detected_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_visit_sessions_project_id ON public.visit_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_visit_sessions_user_id ON public.visit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_sessions_status ON public.visit_sessions(status);

CREATE INDEX IF NOT EXISTS idx_detected_blocks_visit_session_id ON public.detected_blocks(visit_session_id);
CREATE INDEX IF NOT EXISTS idx_detected_blocks_block_number ON public.detected_blocks(block_number);

CREATE INDEX IF NOT EXISTS idx_extracted_frames_visit_session_id ON public.extracted_frames(visit_session_id);
CREATE INDEX IF NOT EXISTS idx_extracted_frames_block_id ON public.extracted_frames(block_id);
CREATE INDEX IF NOT EXISTS idx_extracted_frames_timestamp ON public.extracted_frames(timestamp_seconds);

CREATE INDEX IF NOT EXISTS idx_audio_segments_visit_session_id ON public.audio_segments(visit_session_id);
CREATE INDEX IF NOT EXISTS idx_audio_segments_block_id ON public.audio_segments(block_id);

CREATE INDEX IF NOT EXISTS idx_extracted_tasks_visit_session_id ON public.extracted_tasks(visit_session_id);
CREATE INDEX IF NOT EXISTS idx_extracted_tasks_block_id ON public.extracted_tasks(block_id);