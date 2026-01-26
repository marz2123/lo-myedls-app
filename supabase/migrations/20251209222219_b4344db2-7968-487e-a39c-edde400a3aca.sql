
-- EDL → BIM Engine Tables

-- 1. BIM Models (Main model per EDL)
CREATE TABLE public.edl_bim_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  
  -- Model files
  ifc_url TEXT,
  gltf_url TEXT,
  obj_url TEXT,
  usdz_url TEXT,
  
  -- Model metadata
  accuracy_score NUMERIC DEFAULT 0,
  generation_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  generation_progress NUMERIC DEFAULT 0,
  
  -- Summary metrics
  total_rooms INTEGER DEFAULT 0,
  total_surface_m2 NUMERIC DEFAULT 0,
  total_volume_m3 NUMERIC DEFAULT 0,
  total_objects INTEGER DEFAULT 0,
  
  -- AI analysis
  ai_confidence NUMERIC DEFAULT 0,
  processing_metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. BIM Objects (Individual elements)
CREATE TABLE public.edl_bim_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.edl_bim_models(id) ON DELETE CASCADE,
  room_id UUID,
  location_id UUID,
  zone_id UUID,
  
  -- Object type and identification
  object_type TEXT NOT NULL, -- 'wall', 'door', 'window', 'floor', 'ceiling', 'radiator', 'socket', 'switch', 'luminaire', 'vmc', 'sanitaire', etc.
  object_category TEXT, -- 'structure', 'opening', 'equipment', 'finishing'
  object_name TEXT,
  
  -- Geometry (stored as JSON for flexibility)
  geometry JSONB DEFAULT '{}'::jsonb, -- {vertices, faces, position, rotation, scale}
  bounding_box JSONB DEFAULT '{}'::jsonb, -- {min: {x,y,z}, max: {x,y,z}}
  
  -- Dimensions
  width NUMERIC,
  height NUMERIC,
  depth NUMERIC,
  area_m2 NUMERIC,
  
  -- Material & appearance
  material_type TEXT,
  material_name TEXT,
  color TEXT,
  texture_url TEXT,
  
  -- State & anomalies
  condition_state TEXT, -- 'neuf', 'bon', 'moyen', 'mauvais', 'a_refaire'
  anomalies JSONB DEFAULT '[]'::jsonb,
  linked_task_ids JSONB DEFAULT '[]'::jsonb,
  
  -- AI detection metadata
  confidence_score NUMERIC DEFAULT 0,
  detection_source TEXT, -- 'video', 'photo', 'manual', 'plan'
  source_frame_ids JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. BIM Surfaces (Room surfaces and metrics)
CREATE TABLE public.edl_bim_surfaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.edl_bim_models(id) ON DELETE CASCADE,
  room_id UUID,
  location_id UUID,
  
  -- Room identification
  room_name TEXT NOT NULL,
  room_type TEXT, -- 'sejour', 'chambre', 'cuisine', 'sdb', 'wc', 'entree', 'couloir', etc.
  floor_level INTEGER DEFAULT 0,
  
  -- Dimensions
  surface_m2 NUMERIC DEFAULT 0,
  perimeter_m NUMERIC DEFAULT 0,
  hauteur_sous_plafond NUMERIC DEFAULT 2.5,
  volume_m3 NUMERIC DEFAULT 0,
  
  -- Wall surfaces for metrics
  surface_murs_m2 NUMERIC DEFAULT 0,
  surface_sol_m2 NUMERIC DEFAULT 0,
  surface_plafond_m2 NUMERIC DEFAULT 0,
  
  -- Openings count
  nb_portes INTEGER DEFAULT 0,
  nb_fenetres INTEGER DEFAULT 0,
  
  -- Finishing materials
  sol_material TEXT,
  murs_material TEXT,
  plafond_material TEXT,
  
  -- Metrics for work planning
  ml_plinthes NUMERIC DEFAULT 0,
  ml_corniches NUMERIC DEFAULT 0,
  
  -- State
  global_condition TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. BIM Processing Queue
CREATE TABLE public.edl_bim_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.edl_bim_models(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Processing status
  status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  progress NUMERIC DEFAULT 0,
  current_step TEXT,
  
  -- Input sources
  source_frames JSONB DEFAULT '[]'::jsonb,
  source_videos JSONB DEFAULT '[]'::jsonb,
  source_plans JSONB DEFAULT '[]'::jsonb,
  
  -- Processing results
  detected_rooms JSONB DEFAULT '[]'::jsonb,
  detected_objects JSONB DEFAULT '[]'::jsonb,
  processing_log JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  
  -- Timing
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edl_bim_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_bim_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_bim_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_bim_processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their BIM models"
ON public.edl_bim_models FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can manage BIM objects for their models"
ON public.edl_bim_objects FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.edl_bim_models m
  WHERE m.id = edl_bim_objects.model_id AND m.user_id = auth.uid()
));

CREATE POLICY "Users can manage BIM surfaces for their models"
ON public.edl_bim_surfaces FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.edl_bim_models m
  WHERE m.id = edl_bim_surfaces.model_id AND m.user_id = auth.uid()
));

CREATE POLICY "Users can manage their BIM processing queue"
ON public.edl_bim_processing_queue FOR ALL
USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_bim_models_project ON public.edl_bim_models(project_id);
CREATE INDEX idx_bim_models_status ON public.edl_bim_models(generation_status);
CREATE INDEX idx_bim_objects_model ON public.edl_bim_objects(model_id);
CREATE INDEX idx_bim_objects_type ON public.edl_bim_objects(object_type);
CREATE INDEX idx_bim_surfaces_model ON public.edl_bim_surfaces(model_id);
CREATE INDEX idx_bim_queue_status ON public.edl_bim_processing_queue(status);
