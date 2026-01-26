
-- Create table for AR holographic markers
CREATE TABLE public.edl_holo_markers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE CASCADE,
  room_id TEXT,
  anomaly_id UUID REFERENCES public.detected_anomalies(id) ON DELETE SET NULL,
  marker_type TEXT NOT NULL DEFAULT 'annotation',
  world_anchor JSONB NOT NULL DEFAULT '{}'::jsonb,
  coordinates JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  rotation JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  scale NUMERIC DEFAULT 1.0,
  label TEXT,
  description TEXT,
  severity TEXT DEFAULT 'info',
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_visible BOOLEAN DEFAULT true,
  attached_media_urls JSONB DEFAULT '[]'::jsonb,
  measurement_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AR guided paths
CREATE TABLE public.edl_holo_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  path_name TEXT NOT NULL,
  path_type TEXT DEFAULT 'inspection',
  waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  rooms_sequence JSONB DEFAULT '[]'::jsonb,
  estimated_duration_minutes INTEGER,
  total_distance_meters NUMERIC,
  is_active BOOLEAN DEFAULT true,
  completion_status JSONB DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AR sessions
CREATE TABLE public.edl_holo_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  path_id UUID REFERENCES public.edl_holo_paths(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  ar_mode TEXT DEFAULT 'standard',
  device_info JSONB DEFAULT '{}'::jsonb,
  tracking_quality TEXT DEFAULT 'unknown',
  markers_placed INTEGER DEFAULT 0,
  measurements_taken INTEGER DEFAULT 0,
  photos_captured INTEGER DEFAULT 0,
  rooms_completed JSONB DEFAULT '[]'::jsonb,
  session_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AR measurements
CREATE TABLE public.edl_holo_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.edl_holo_sessions(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  room_id TEXT,
  measurement_type TEXT NOT NULL,
  start_point JSONB NOT NULL,
  end_point JSONB,
  value_meters NUMERIC,
  value_display TEXT,
  unit TEXT DEFAULT 'm',
  accuracy_confidence NUMERIC,
  linked_anomaly_id UUID REFERENCES public.detected_anomalies(id) ON DELETE SET NULL,
  linked_marker_id UUID REFERENCES public.edl_holo_markers(id) ON DELETE SET NULL,
  screenshot_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edl_holo_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_holo_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_holo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_holo_measurements ENABLE ROW LEVEL SECURITY;

-- RLS policies for markers
CREATE POLICY "Users can manage their own markers"
  ON public.edl_holo_markers FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for paths
CREATE POLICY "Users can manage their own paths"
  ON public.edl_holo_paths FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for sessions
CREATE POLICY "Users can manage their own sessions"
  ON public.edl_holo_sessions FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for measurements
CREATE POLICY "Users can manage their own measurements"
  ON public.edl_holo_measurements FOR ALL
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_holo_markers_project ON public.edl_holo_markers(project_id);
CREATE INDEX idx_holo_markers_room ON public.edl_holo_markers(room_id);
CREATE INDEX idx_holo_paths_project ON public.edl_holo_paths(project_id);
CREATE INDEX idx_holo_sessions_project ON public.edl_holo_sessions(project_id);
CREATE INDEX idx_holo_measurements_session ON public.edl_holo_measurements(session_id);
