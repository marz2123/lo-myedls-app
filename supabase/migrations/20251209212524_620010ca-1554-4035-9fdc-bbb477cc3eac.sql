
-- Multi-Unit Buildings (Immeubles)
CREATE TABLE public.multiunit_buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  owner_company TEXT,
  manager_company TEXT,
  total_units INTEGER DEFAULT 0,
  total_floors INTEGER DEFAULT 0,
  construction_year INTEGER,
  building_type TEXT DEFAULT 'residential',
  common_areas_count INTEGER DEFAULT 0,
  annexes_count INTEGER DEFAULT 0,
  global_status TEXT DEFAULT 'pending',
  global_quality_score NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Multi-Unit Units (Lots/Appartements)
CREATE TABLE public.multiunit_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.multiunit_buildings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  unit_number TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'apartment',
  apartment_type TEXT,
  floor_number INTEGER DEFAULT 0,
  surface_m2 NUMERIC,
  occupant_name TEXT,
  occupant_type TEXT DEFAULT 'tenant',
  edl_status TEXT DEFAULT 'pending',
  entry_edl_id UUID,
  exit_edl_id UUID,
  quality_score NUMERIC,
  is_template BOOLEAN DEFAULT false,
  template_source_id UUID,
  similarity_group TEXT,
  similarity_score NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Multi-Unit EDL Links
CREATE TABLE public.multiunit_edl_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.multiunit_units(id) ON DELETE CASCADE,
  edl_id UUID,
  session_id UUID REFERENCES public.visit_sessions(id),
  link_type TEXT NOT NULL DEFAULT 'entry',
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  quality_score NUMERIC,
  anomalies_count INTEGER DEFAULT 0,
  tasks_count INTEGER DEFAULT 0,
  photos_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Multi-Unit Analysis Results
CREATE TABLE public.multiunit_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.multiunit_buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.multiunit_units(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  result_json JSONB DEFAULT '{}'::jsonb,
  similarity_matches JSONB DEFAULT '[]'::jsonb,
  detected_patterns JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Multi-Unit Reports
CREATE TABLE public.multiunit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.multiunit_buildings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'global',
  report_json JSONB DEFAULT '{}'::jsonb,
  summary_stats JSONB DEFAULT '{}'::jsonb,
  floor_summaries JSONB DEFAULT '[]'::jsonb,
  type_summaries JSONB DEFAULT '[]'::jsonb,
  global_anomalies JSONB DEFAULT '[]'::jsonb,
  global_tasks JSONB DEFAULT '[]'::jsonb,
  pdf_url TEXT,
  dpgf_url TEXT,
  planning_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Processing Queue for async batch processing
CREATE TABLE public.multiunit_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.multiunit_buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.multiunit_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',
  progress_percent INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  result_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.multiunit_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiunit_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiunit_edl_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiunit_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiunit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiunit_processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multiunit_buildings
CREATE POLICY "Users can manage their buildings" ON public.multiunit_buildings
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for multiunit_units
CREATE POLICY "Users can manage units in their buildings" ON public.multiunit_units
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.multiunit_buildings b 
    WHERE b.id = multiunit_units.building_id AND b.user_id = auth.uid()
  ));

-- RLS Policies for multiunit_edl_links
CREATE POLICY "Users can manage EDL links for their units" ON public.multiunit_edl_links
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.multiunit_units u
    JOIN public.multiunit_buildings b ON b.id = u.building_id
    WHERE u.id = multiunit_edl_links.unit_id AND b.user_id = auth.uid()
  ));

-- RLS Policies for multiunit_analysis
CREATE POLICY "Users can view analysis for their buildings" ON public.multiunit_analysis
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.multiunit_buildings b 
    WHERE b.id = multiunit_analysis.building_id AND b.user_id = auth.uid()
  ));

-- RLS Policies for multiunit_reports
CREATE POLICY "Users can manage reports for their buildings" ON public.multiunit_reports
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for multiunit_processing_queue
CREATE POLICY "Users can manage their processing queue" ON public.multiunit_processing_queue
  FOR ALL USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_multiunit_units_building ON public.multiunit_units(building_id);
CREATE INDEX idx_multiunit_units_status ON public.multiunit_units(edl_status);
CREATE INDEX idx_multiunit_units_floor ON public.multiunit_units(floor_number);
CREATE INDEX idx_multiunit_units_type ON public.multiunit_units(apartment_type);
CREATE INDEX idx_multiunit_edl_links_unit ON public.multiunit_edl_links(unit_id);
CREATE INDEX idx_multiunit_analysis_building ON public.multiunit_analysis(building_id);
CREATE INDEX idx_multiunit_queue_status ON public.multiunit_processing_queue(status);
CREATE INDEX idx_multiunit_queue_building ON public.multiunit_processing_queue(building_id);
