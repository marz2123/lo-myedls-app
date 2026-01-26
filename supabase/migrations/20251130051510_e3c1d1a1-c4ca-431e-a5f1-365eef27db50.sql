-- Table pour stocker les snapshots d'enrichissement immobilier
CREATE TABLE public.property_enrichment_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Adresse
  address_input TEXT NOT NULL,
  address_normalized TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  
  -- Localisation administrative
  code_insee TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'France',
  
  -- Cadastre
  cadastre_section TEXT,
  cadastre_parcelle TEXT,
  cadastre_surface_m2 DOUBLE PRECISION,
  cadastre_geom JSONB,
  
  -- Données enrichies (JSONB)
  market_json JSONB DEFAULT '{}'::jsonb,
  risks_json JSONB DEFAULT '{}'::jsonb,
  urbanism_json JSONB DEFAULT '{}'::jsonb,
  owners_json JSONB DEFAULT '{}'::jsonb,
  district_json JSONB DEFAULT '{}'::jsonb,
  climate_json JSONB DEFAULT '{}'::jsonb,
  imagery_json JSONB DEFAULT '{}'::jsonb,
  
  -- Analyse IA
  ai_summary_json JSONB DEFAULT '{}'::jsonb,
  ai_confidence DOUBLE PRECISION,
  
  -- Statut des sources
  source_status_json JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_property_enrichment_project_id ON public.property_enrichment_snapshots(project_id);
CREATE INDEX idx_property_enrichment_address ON public.property_enrichment_snapshots(address_input);
CREATE INDEX idx_property_enrichment_coords ON public.property_enrichment_snapshots(latitude, longitude);
CREATE INDEX idx_property_enrichment_code_insee ON public.property_enrichment_snapshots(code_insee);

-- Enable RLS
ALTER TABLE public.property_enrichment_snapshots ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir les snapshots de leurs projets
CREATE POLICY "Users can view enrichment for their projects"
ON public.property_enrichment_snapshots
FOR SELECT
USING (
  project_id IS NULL OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = property_enrichment_snapshots.project_id
    AND p.user_id = auth.uid()
  )
);

-- Politique : insertion publique (edge function avec service role)
CREATE POLICY "Service can insert enrichment snapshots"
ON public.property_enrichment_snapshots
FOR INSERT
WITH CHECK (true);

-- Politique : mise à jour pour les projets de l'utilisateur
CREATE POLICY "Users can update enrichment for their projects"
ON public.property_enrichment_snapshots
FOR UPDATE
USING (
  project_id IS NULL OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = property_enrichment_snapshots.project_id
    AND p.user_id = auth.uid()
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_property_enrichment_updated_at
BEFORE UPDATE ON public.property_enrichment_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();