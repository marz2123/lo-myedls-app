-- Digital Twin Models table
CREATE TABLE public.digital_twin_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  bim_model_id UUID REFERENCES public.edl_bim_models(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  model_version INTEGER DEFAULT 1,
  json_model JSONB DEFAULT '{}'::jsonb,
  ifc_url TEXT,
  gltf_url TEXT,
  usdz_url TEXT,
  sync_status TEXT DEFAULT 'idle',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_sources JSONB DEFAULT '[]'::jsonb,
  element_states JSONB DEFAULT '{}'::jsonb,
  total_elements INTEGER DEFAULT 0,
  total_anomalies INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  health_score NUMERIC DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Digital Twin Updates log
CREATE TABLE public.digital_twin_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.digital_twin_models(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL,
  object_id TEXT,
  object_type TEXT,
  old_state JSONB,
  new_state JSONB,
  source TEXT NOT NULL,
  source_id UUID,
  confidence_score NUMERIC DEFAULT 0.8,
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Digital Twin IoT sensors
CREATE TABLE public.digital_twin_iot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.digital_twin_models(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  sensor_name TEXT,
  last_value NUMERIC,
  unit TEXT,
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  alert_status TEXT DEFAULT 'normal',
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  history JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Digital Twin Snapshots for timeline
CREATE TABLE public.digital_twin_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES public.digital_twin_models(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  model_state JSONB NOT NULL,
  element_states JSONB DEFAULT '{}'::jsonb,
  anomalies_snapshot JSONB DEFAULT '[]'::jsonb,
  tasks_snapshot JSONB DEFAULT '[]'::jsonb,
  iot_snapshot JSONB DEFAULT '[]'::jsonb,
  health_score NUMERIC,
  description TEXT,
  is_milestone BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digital_twin_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_twin_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_twin_iot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_twin_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for digital_twin_models
CREATE POLICY "Users can view their own twins" ON public.digital_twin_models
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own twins" ON public.digital_twin_models
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own twins" ON public.digital_twin_models
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own twins" ON public.digital_twin_models
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for digital_twin_updates
CREATE POLICY "Users can view updates for their twins" ON public.digital_twin_updates
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.digital_twin_models m WHERE m.id = twin_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Users can create updates for their twins" ON public.digital_twin_updates
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.digital_twin_models m WHERE m.id = twin_id AND m.user_id = auth.uid()
  ));

-- RLS Policies for digital_twin_iot
CREATE POLICY "Users can manage IoT for their twins" ON public.digital_twin_iot
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.digital_twin_models m WHERE m.id = twin_id AND m.user_id = auth.uid()
  ));

-- RLS Policies for digital_twin_snapshots
CREATE POLICY "Users can manage snapshots for their twins" ON public.digital_twin_snapshots
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.digital_twin_models m WHERE m.id = twin_id AND m.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_twin_models_project ON public.digital_twin_models(project_id);
CREATE INDEX idx_twin_models_user ON public.digital_twin_models(user_id);
CREATE INDEX idx_twin_updates_twin ON public.digital_twin_updates(twin_id);
CREATE INDEX idx_twin_updates_created ON public.digital_twin_updates(created_at DESC);
CREATE INDEX idx_twin_iot_twin ON public.digital_twin_iot(twin_id);
CREATE INDEX idx_twin_snapshots_twin ON public.digital_twin_snapshots(twin_id);
CREATE INDEX idx_twin_snapshots_date ON public.digital_twin_snapshots(snapshot_date DESC);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_twin_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_twin_iot;