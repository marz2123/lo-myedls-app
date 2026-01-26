-- =====================================================
-- MyEDLS Complete Business Model Refactoring
-- Structure: Bien → Partie → Lieu → Zone → Problème → Tâche
-- =====================================================

-- 1. Add missing fields to property_composition (Fiche Bien)
ALTER TABLE public.property_composition
ADD COLUMN IF NOT EXISTS type_bien TEXT,
ADD COLUMN IF NOT EXISTS nom_bien TEXT,
ADD COLUMN IF NOT EXISTS contexte_historique TEXT,
ADD COLUMN IF NOT EXISTS sinistres_precedents TEXT,
ADD COLUMN IF NOT EXISTS travaux_anterieurs_detail JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS date_construction DATE,
ADD COLUMN IF NOT EXISTS surface_totale_m2 NUMERIC,
ADD COLUMN IF NOT EXISTS nb_etages INTEGER,
ADD COLUMN IF NOT EXISTS nb_caves INTEGER,
ADD COLUMN IF NOT EXISTS nb_locaux_techniques INTEGER,
ADD COLUMN IF NOT EXISTS acces_handicapes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS type_chauffage TEXT,
ADD COLUMN IF NOT EXISTS type_ventilation TEXT,
ADD COLUMN IF NOT EXISTS diagnostics_existants JSONB DEFAULT '[]'::jsonb;

-- 2. Add AR measurements to location_zones
ALTER TABLE public.location_zones
ADD COLUMN IF NOT EXISTS mesures_ar JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS position_dans_lieu TEXT,
ADD COLUMN IF NOT EXISTS surface_m2 NUMERIC,
ADD COLUMN IF NOT EXISTS longueur_m NUMERIC,
ADD COLUMN IF NOT EXISTS largeur_m NUMERIC,
ADD COLUMN IF NOT EXISTS hauteur_m NUMERIC,
ADD COLUMN IF NOT EXISTS materiaux_detectes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pathologies_detectees JSONB DEFAULT '[]'::jsonb;

-- 3. Create dedicated medias table
CREATE TABLE IF NOT EXISTS public.visit_medias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.visit_sequences(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES public.location_zones(id) ON DELETE SET NULL,
  problem_id UUID REFERENCES public.identified_problems(id) ON DELETE SET NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'audio', 'document')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename TEXT,
  file_size_bytes INTEGER,
  duration_seconds NUMERIC,
  timestamp_in_sequence NUMERIC,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  annotations JSONB DEFAULT '[]'::jsonb,
  is_key_frame BOOLEAN DEFAULT false,
  caption TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on visit_medias
ALTER TABLE public.visit_medias ENABLE ROW LEVEL SECURITY;

-- RLS policies for visit_medias
CREATE POLICY "Users can manage medias of their projects"
ON public.visit_medias
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = visit_medias.project_id AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = visit_medias.project_id AND p.user_id = auth.uid()
));

-- 4. Add more fields to identified_problems
ALTER TABLE public.identified_problems
ADD COLUMN IF NOT EXISTS origine TEXT DEFAULT 'ia' CHECK (origine IN ('ia', 'user', 'document')),
ADD COLUMN IF NOT EXISTS position_x NUMERIC,
ADD COLUMN IF NOT EXISTS position_y NUMERIC,
ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS urgence TEXT DEFAULT 'normale' CHECK (urgence IN ('immediate', 'haute', 'normale', 'basse')),
ADD COLUMN IF NOT EXISTS cout_estime_min NUMERIC,
ADD COLUMN IF NOT EXISTS cout_estime_max NUMERIC,
ADD COLUMN IF NOT EXISTS date_constatation TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS recommandations TEXT;

-- 5. Add more fields to problem_tasks
ALTER TABLE public.problem_tasks
ADD COLUMN IF NOT EXISTS etat_validation TEXT DEFAULT 'en_attente' CHECK (etat_validation IN ('en_attente', 'valide', 'rejete', 'modifie')),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS validated_by UUID,
ADD COLUMN IF NOT EXISTS notes_validation TEXT,
ADD COLUMN IF NOT EXISTS ordre_execution INTEGER,
ADD COLUMN IF NOT EXISTS delai_estime_jours INTEGER,
ADD COLUMN IF NOT EXISTS corps_metier TEXT,
ADD COLUMN IF NOT EXISTS difficulte TEXT DEFAULT 'moyenne' CHECK (difficulte IN ('facile', 'moyenne', 'difficile', 'expert'));

-- 6. Add more fields to visit_sequences for better tracking
ALTER TABLE public.visit_sequences
ADD COLUMN IF NOT EXISTS ordre_visite INTEGER,
ADD COLUMN IF NOT EXISTS commentaire_global TEXT,
ADD COLUMN IF NOT EXISTS conditions_visite JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS signature_visiteur TEXT,
ADD COLUMN IF NOT EXISTS gps_coordinates JSONB DEFAULT '{}'::jsonb;

-- 7. Add more fields to property_locations
ALTER TABLE public.property_locations
ADD COLUMN IF NOT EXISTS etage INTEGER,
ADD COLUMN IF NOT EXISTS numero_lot TEXT,
ADD COLUMN IF NOT EXISTS proprietaire TEXT,
ADD COLUMN IF NOT EXISTS locataire TEXT,
ADD COLUMN IF NOT EXISTS occupation_status TEXT DEFAULT 'occupe' CHECK (occupation_status IN ('occupe', 'vacant', 'en_travaux')),
ADD COLUMN IF NOT EXISTS dernier_etat_date DATE,
ADD COLUMN IF NOT EXISTS photos_reference JSONB DEFAULT '[]'::jsonb;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visit_medias_project ON public.visit_medias(project_id);
CREATE INDEX IF NOT EXISTS idx_visit_medias_sequence ON public.visit_medias(sequence_id);
CREATE INDEX IF NOT EXISTS idx_visit_medias_zone ON public.visit_medias(zone_id);
CREATE INDEX IF NOT EXISTS idx_location_zones_location ON public.location_zones(location_id);
CREATE INDEX IF NOT EXISTS idx_identified_problems_zone ON public.identified_problems(zone_id);
CREATE INDEX IF NOT EXISTS idx_problem_tasks_problem ON public.problem_tasks(problem_id);

-- 9. Create view for complete task hierarchy
CREATE OR REPLACE VIEW public.taches_completes AS
SELECT 
  t.id as tache_id,
  t.title as titre_tache,
  t.description as description_tache,
  t.quantity as quantite,
  t.unit as unite,
  t.condition as etat,
  t.priority as priorite,
  t.status as statut,
  t.etat_validation,
  t.estimated_cost_min,
  t.estimated_cost_max,
  t.work_type as type_travaux,
  t.corps_metier,
  t.difficulte,
  t.created_at,
  -- Problème associé
  ip.id as probleme_id,
  ip.title as titre_probleme,
  ip.severity as severite_probleme,
  ip.urgence,
  ip.origine as origine_probleme,
  -- Zone
  lz.id as zone_id,
  lz.zone_type as type_zone,
  lz.custom_name as nom_zone,
  lz.condition as etat_zone,
  lz.mesures_ar,
  -- Lieu
  pl.id as lieu_id,
  pl.name as nom_lieu,
  pl.location_type as type_lieu,
  pl.floor_level as etage,
  pl.overall_condition as etat_lieu,
  -- Partie
  pp.id as partie_id,
  pp.name as nom_partie,
  pp.part_type as type_partie,
  -- Bien/Projet
  p.id as bien_id,
  p.address as adresse_bien,
  p.property_type as type_bien,
  p.city as ville,
  -- Classification DSC
  tf.code as famille_code,
  tf.name as famille_nom,
  tc.code as categorie_code,
  tc.name as categorie_nom,
  ts.code as sous_categorie_code,
  ts.name as sous_categorie_nom
FROM public.problem_tasks t
LEFT JOIN public.identified_problems ip ON t.problem_id = ip.id
LEFT JOIN public.location_zones lz ON t.zone_id = lz.id OR ip.zone_id = lz.id
LEFT JOIN public.property_locations pl ON t.location_id = pl.id OR ip.location_id = pl.id
LEFT JOIN public.property_parts pp ON t.part_id = pp.id OR pl.part_id = pp.id
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.task_families tf ON t.family_id = tf.id
LEFT JOIN public.task_categories tc ON t.category_id = tc.id
LEFT JOIN public.task_subcategories ts ON t.subcategory_id = ts.id;

-- 10. Create view for sequence timeline
CREATE OR REPLACE VIEW public.timeline_sequences AS
SELECT 
  vs.id as sequence_id,
  vs.started_at,
  vs.ended_at,
  vs.duration_seconds,
  vs.status,
  vs.detected_condition as etat_detecte,
  vs.user_condition as etat_confirme,
  vs.detected_zones as zones_detectees,
  vs.transcription,
  vs.ordre_visite,
  -- Counts
  (SELECT COUNT(*) FROM public.identified_problems WHERE sequence_id = vs.id) as nb_problemes,
  (SELECT COUNT(*) FROM public.problem_tasks WHERE problem_id IN (SELECT id FROM public.identified_problems WHERE sequence_id = vs.id)) as nb_taches,
  (SELECT COUNT(*) FROM public.visit_medias WHERE sequence_id = vs.id) as nb_medias,
  -- Location info
  pl.id as lieu_id,
  pl.name as nom_lieu,
  pl.location_type as type_lieu,
  -- Part info
  pp.id as partie_id,
  pp.name as nom_partie,
  pp.part_type as type_partie,
  -- Project info
  p.id as bien_id,
  p.address as adresse
FROM public.visit_sequences vs
LEFT JOIN public.property_locations pl ON vs.location_id = pl.id
LEFT JOIN public.property_parts pp ON vs.part_id = pp.id
LEFT JOIN public.projects p ON vs.project_id = p.id
ORDER BY vs.started_at DESC;

-- 11. Update trigger for medias
CREATE OR REPLACE TRIGGER update_visit_medias_updated_at
BEFORE UPDATE ON public.visit_medias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();