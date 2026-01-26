
-- TimeWarp EDL Engine Tables
-- Stores historical snapshots and temporal comparisons

-- TimeWarp Snapshots - stores 3D state for each EDL/year
CREATE TABLE public.timewarp_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  snapshot_year INTEGER NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_type TEXT NOT NULL DEFAULT 'edl' CHECK (snapshot_type IN ('edl', 'predicted', 'simulated', 'manual')),
  gltf_url TEXT,
  ifc_url TEXT,
  thumbnail_url TEXT,
  anomalies_json JSONB DEFAULT '[]'::jsonb,
  furniture_json JSONB DEFAULT '[]'::jsonb,
  energy_json JSONB DEFAULT '{}'::jsonb,
  audio_json JSONB DEFAULT '[]'::jsonb,
  materials_json JSONB DEFAULT '{}'::jsonb,
  rooms_state JSONB DEFAULT '{}'::jsonb,
  overall_condition TEXT CHECK (overall_condition IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  health_score NUMERIC(5,2),
  confidence_score NUMERIC(3,2) DEFAULT 1.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TimeWarp Transitions - tracks changes between years
CREATE TABLE public.timewarp_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  from_snapshot_id UUID REFERENCES public.timewarp_snapshots(id) ON DELETE CASCADE,
  to_snapshot_id UUID REFERENCES public.timewarp_snapshots(id) ON DELETE CASCADE,
  from_year INTEGER NOT NULL,
  to_year INTEGER NOT NULL,
  transition_type TEXT NOT NULL DEFAULT 'natural' CHECK (transition_type IN ('natural', 'renovation', 'degradation', 'repair', 'replacement')),
  changes_json JSONB DEFAULT '[]'::jsonb,
  anomalies_appeared JSONB DEFAULT '[]'::jsonb,
  anomalies_resolved JSONB DEFAULT '[]'::jsonb,
  works_performed JSONB DEFAULT '[]'::jsonb,
  degradation_rate NUMERIC(5,2),
  improvement_score NUMERIC(5,2),
  summary TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TimeWarp Predictions - AI predictions for future/missing years
CREATE TABLE public.timewarp_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  prediction_year INTEGER NOT NULL,
  prediction_type TEXT NOT NULL DEFAULT 'future' CHECK (prediction_type IN ('future', 'gap_fill', 'simulation')),
  base_snapshot_id UUID REFERENCES public.timewarp_snapshots(id) ON DELETE SET NULL,
  predicted_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_anomalies JSONB DEFAULT '[]'::jsonb,
  predicted_degradation JSONB DEFAULT '[]'::jsonb,
  predicted_works_needed JSONB DEFAULT '[]'::jsonb,
  confidence_level NUMERIC(3,2) DEFAULT 0.5,
  model_version TEXT DEFAULT 'v1',
  factors_considered JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TimeWarp Room History - tracks individual room evolution
CREATE TABLE public.timewarp_room_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.timewarp_snapshots(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  room_name TEXT,
  room_type TEXT,
  year INTEGER NOT NULL,
  state_json JSONB DEFAULT '{}'::jsonb,
  materials JSONB DEFAULT '{}'::jsonb,
  anomalies JSONB DEFAULT '[]'::jsonb,
  furniture JSONB DEFAULT '[]'::jsonb,
  measurements JSONB DEFAULT '{}'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timewarp_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timewarp_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timewarp_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timewarp_room_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timewarp_snapshots
CREATE POLICY "Users can view their own snapshots" ON public.timewarp_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own snapshots" ON public.timewarp_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own snapshots" ON public.timewarp_snapshots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own snapshots" ON public.timewarp_snapshots
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for timewarp_transitions
CREATE POLICY "Users can view their own transitions" ON public.timewarp_transitions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transitions" ON public.timewarp_transitions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transitions" ON public.timewarp_transitions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transitions" ON public.timewarp_transitions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for timewarp_predictions
CREATE POLICY "Users can view their own predictions" ON public.timewarp_predictions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own predictions" ON public.timewarp_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own predictions" ON public.timewarp_predictions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own predictions" ON public.timewarp_predictions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for timewarp_room_history
CREATE POLICY "Users can view room history via snapshots" ON public.timewarp_room_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.timewarp_snapshots s 
      WHERE s.id = snapshot_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create room history" ON public.timewarp_room_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timewarp_snapshots s 
      WHERE s.id = snapshot_id AND s.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_timewarp_snapshots_project ON public.timewarp_snapshots(project_id);
CREATE INDEX idx_timewarp_snapshots_year ON public.timewarp_snapshots(snapshot_year);
CREATE INDEX idx_timewarp_transitions_project ON public.timewarp_transitions(project_id);
CREATE INDEX idx_timewarp_predictions_project ON public.timewarp_predictions(project_id);
CREATE INDEX idx_timewarp_predictions_year ON public.timewarp_predictions(prediction_year);
CREATE INDEX idx_timewarp_room_history_room ON public.timewarp_room_history(room_id, year);
