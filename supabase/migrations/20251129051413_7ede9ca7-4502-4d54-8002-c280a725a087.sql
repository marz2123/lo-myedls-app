-- =====================================================
-- PHASE 1: NEW BUSINESS MODEL - MyEDLS Refactoring
-- Structure: Bien → Partie → Lieu → Zone → Problème → Tâche
-- =====================================================

-- ENUM for part types (Parties Communes / Parties Privatives)
CREATE TYPE property_part_type AS ENUM ('commune', 'privative');

-- ENUM for condition states (3 états simples)
CREATE TYPE condition_state AS ENUM ('neuf', 'bon', 'a_refaire');

-- ENUM for zone types (Zones fixes standards)
CREATE TYPE zone_type AS ENUM (
  'murs',
  'sol',
  'plafond',
  'menuiseries',
  'electricite',
  'plomberie',
  'equipements',
  'ventilation',
  'chauffage',
  'facade',
  'toiture',
  'autre'
);

-- =====================================================
-- TABLE: property_parts (Parties du Bien)
-- =====================================================
CREATE TABLE public.property_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  part_type property_part_type NOT NULL,
  name TEXT NOT NULL, -- e.g., "Parties Communes", "Appartements"
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage parts of their projects" 
ON public.property_parts 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = property_parts.project_id 
  AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = property_parts.project_id 
  AND p.user_id = auth.uid()
));

CREATE INDEX idx_property_parts_project ON public.property_parts(project_id);

-- =====================================================
-- TABLE: property_locations (Lieux)
-- =====================================================
CREATE TABLE public.property_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES public.property_parts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Appart 201", "Façade rue", "Cage A"
  location_type TEXT, -- "appartement", "facade", "cage", "parking", "jardin", etc.
  floor_level TEXT, -- "RDC", "1er", "2ème", "SS1"
  surface_m2 NUMERIC,
  description TEXT,
  overall_condition condition_state,
  order_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage locations of their projects" 
ON public.property_locations 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = property_locations.project_id 
  AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = property_locations.project_id 
  AND p.user_id = auth.uid()
));

CREATE INDEX idx_property_locations_part ON public.property_locations(part_id);
CREATE INDEX idx_property_locations_project ON public.property_locations(project_id);

-- =====================================================
-- TABLE: location_zones (Zones d'un Lieu)
-- =====================================================
CREATE TABLE public.location_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.property_locations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  zone_type zone_type NOT NULL,
  custom_name TEXT, -- For custom naming if needed
  condition condition_state,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.location_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage zones of their projects" 
ON public.location_zones 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = location_zones.project_id 
  AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = location_zones.project_id 
  AND p.user_id = auth.uid()
));

CREATE INDEX idx_location_zones_location ON public.location_zones(location_id);
CREATE INDEX idx_location_zones_project ON public.location_zones(project_id);

-- =====================================================
-- TABLE: visit_sequences (Séquences de visite)
-- =====================================================
CREATE TABLE public.visit_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.property_parts(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.property_locations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  
  -- Media references
  video_url TEXT,
  audio_url TEXT,
  photos JSONB DEFAULT '[]', -- Array of photo URLs
  
  -- Transcription and analysis
  transcription TEXT,
  ai_analysis JSONB DEFAULT '{}',
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Status
  status TEXT DEFAULT 'recording', -- 'recording', 'processing', 'completed', 'error'
  
  -- Overall state detected
  detected_condition condition_state,
  user_condition condition_state, -- User override
  
  -- Detected zones in this sequence
  detected_zones zone_type[] DEFAULT '{}',
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their visit sequences" 
ON public.visit_sequences 
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_visit_sequences_project ON public.visit_sequences(project_id);
CREATE INDEX idx_visit_sequences_location ON public.visit_sequences(location_id);
CREATE INDEX idx_visit_sequences_user ON public.visit_sequences(user_id);

-- =====================================================
-- TABLE: identified_problems (Problèmes identifiés)
-- =====================================================
CREATE TABLE public.identified_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID REFERENCES public.visit_sequences(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.property_locations(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.location_zones(id) ON DELETE SET NULL,
  
  -- Problem details
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Zone info (can be standalone if zone_id is null)
  zone_type zone_type,
  
  -- Media evidence
  photo_urls JSONB DEFAULT '[]',
  video_timestamp_start NUMERIC,
  video_timestamp_end NUMERIC,
  
  -- AI detection confidence
  ai_detected BOOLEAN DEFAULT false,
  detection_confidence NUMERIC,
  
  -- Status
  is_confirmed BOOLEAN DEFAULT true,
  is_resolved BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.identified_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage problems of their projects" 
ON public.identified_problems 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = identified_problems.project_id 
  AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = identified_problems.project_id 
  AND p.user_id = auth.uid()
));

CREATE INDEX idx_identified_problems_project ON public.identified_problems(project_id);
CREATE INDEX idx_identified_problems_sequence ON public.identified_problems(sequence_id);
CREATE INDEX idx_identified_problems_location ON public.identified_problems(location_id);

-- =====================================================
-- TABLE: problem_tasks (Lien Problème → Tâche FT/CT/ST)
-- =====================================================
CREATE TABLE public.problem_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES public.identified_problems(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Full location path for exports
  part_id UUID REFERENCES public.property_parts(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.property_locations(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.location_zones(id) ON DELETE SET NULL,
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  
  -- DSC Classification (FT/CT/ST)
  family_id UUID REFERENCES public.task_families(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.task_subcategories(id) ON DELETE SET NULL,
  
  -- Classification confidence
  classification_confidence NUMERIC,
  
  -- Condition state
  condition condition_state,
  
  -- Quantities and estimates
  quantity NUMERIC,
  unit TEXT, -- m², ml, u, etc.
  estimated_cost_min NUMERIC,
  estimated_cost_max NUMERIC,
  
  -- Priority
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Work type
  work_type TEXT, -- 'reparation', 'remplacement', 'renovation', 'entretien'
  
  -- Media
  photo_urls JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.problem_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tasks of their projects" 
ON public.problem_tasks 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = problem_tasks.project_id 
  AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = problem_tasks.project_id 
  AND p.user_id = auth.uid()
));

CREATE INDEX idx_problem_tasks_problem ON public.problem_tasks(problem_id);
CREATE INDEX idx_problem_tasks_project ON public.problem_tasks(project_id);
CREATE INDEX idx_problem_tasks_location ON public.problem_tasks(location_id);

-- =====================================================
-- TABLE: property_composition (Composition du Bien - préparation)
-- =====================================================
CREATE TABLE public.property_composition (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  
  -- Building info
  building_year INTEGER,
  building_type TEXT, -- 'immeuble', 'maison', 'appartement', 'plateau', 'commercial'
  total_floors INTEGER,
  
  -- Composition counts
  nb_apartments INTEGER DEFAULT 0,
  nb_staircases INTEGER DEFAULT 0, -- Cages d'escalier
  nb_parking_spots INTEGER DEFAULT 0,
  nb_boxes INTEGER DEFAULT 0,
  nb_garages INTEGER DEFAULT 0,
  nb_facades INTEGER DEFAULT 0,
  nb_gardens INTEGER DEFAULT 0,
  
  -- History & context
  history_notes TEXT,
  previous_works TEXT,
  known_issues TEXT,
  constraints TEXT,
  
  -- AI-generated structure suggestion
  ai_suggested_structure JSONB DEFAULT '{}',
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.property_composition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage composition of their projects" 
ON public.property_composition 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = property_composition.project_id 
  AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = property_composition.project_id 
  AND p.user_id = auth.uid()
));

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE TRIGGER update_property_parts_updated_at
  BEFORE UPDATE ON public.property_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_locations_updated_at
  BEFORE UPDATE ON public.property_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_zones_updated_at
  BEFORE UPDATE ON public.location_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visit_sequences_updated_at
  BEFORE UPDATE ON public.visit_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_identified_problems_updated_at
  BEFORE UPDATE ON public.identified_problems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_problem_tasks_updated_at
  BEFORE UPDATE ON public.problem_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_composition_updated_at
  BEFORE UPDATE ON public.property_composition
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();