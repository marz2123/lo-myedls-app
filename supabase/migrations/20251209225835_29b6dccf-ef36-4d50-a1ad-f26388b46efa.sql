-- Create EDL Energy Profiles table
CREATE TABLE public.edl_energy_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
  bim_model_id UUID REFERENCES public.edl_bim_models(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  
  -- Energy classification
  classe_energie TEXT CHECK (classe_energie IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  classe_ges TEXT CHECK (classe_ges IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  
  -- Consumption estimates
  consommation_chauffage_kwh NUMERIC,
  consommation_ecs_kwh NUMERIC,
  consommation_electrique_kwh NUMERIC,
  consommation_totale_kwh NUMERIC,
  consommation_kwh_m2_an NUMERIC,
  
  -- Costs
  cout_annuel_energie NUMERIC,
  cout_chauffage NUMERIC,
  cout_electricite NUMERIC,
  cout_ecs NUMERIC,
  
  -- Carbon footprint
  emissions_co2_kg_an NUMERIC,
  emissions_co2_kg_m2_an NUMERIC,
  bilan_carbone JSONB DEFAULT '{}'::jsonb,
  
  -- Building envelope analysis
  isolation_score NUMERIC CHECK (isolation_score >= 0 AND isolation_score <= 100),
  etancheite_score NUMERIC CHECK (etancheite_score >= 0 AND etancheite_score <= 100),
  ponts_thermiques_detectes JSONB DEFAULT '[]'::jsonb,
  materiaux_detectes JSONB DEFAULT '[]'::jsonb,
  
  -- Equipment analysis
  chauffage_type TEXT,
  chauffage_energie TEXT,
  chauffage_rendement NUMERIC,
  ventilation_type TEXT,
  ecs_type TEXT,
  menuiseries_type TEXT,
  menuiseries_qualite TEXT,
  
  -- RE2020/RT2012 compliance
  conformite_re2020 BOOLEAN DEFAULT false,
  conformite_rt2012 BOOLEAN DEFAULT false,
  score_re2020 NUMERIC CHECK (score_re2020 >= 0 AND score_re2020 <= 100),
  non_conformites JSONB DEFAULT '[]'::jsonb,
  
  -- Surfaces from BIM
  surface_habitable_m2 NUMERIC,
  surface_chauffee_m2 NUMERIC,
  volume_chauffe_m3 NUMERIC,
  hauteur_sous_plafond NUMERIC,
  
  -- AI analysis metadata
  ai_confidence_score NUMERIC CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  analysis_metadata JSONB DEFAULT '{}'::jsonb,
  photos_analyzed INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
  analyzed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create EDL Energy Recommendations table
CREATE TABLE public.edl_energy_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  energy_profile_id UUID NOT NULL REFERENCES public.edl_energy_profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Recommendation details
  type_travaux TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('isolation', 'menuiseries', 'chauffage', 'ventilation', 'ecs', 'eclairage', 'autres')),
  priorite INTEGER CHECK (priorite >= 1 AND priorite <= 5),
  
  -- Description
  titre TEXT NOT NULL,
  description TEXT,
  details_techniques JSONB DEFAULT '{}'::jsonb,
  
  -- Gains
  gain_kwh_m2_an NUMERIC,
  gain_pourcentage NUMERIC,
  nouvelle_classe_energie TEXT,
  reduction_co2_kg_an NUMERIC,
  
  -- Costs
  cout_estimatif_min NUMERIC,
  cout_estimatif_max NUMERIC,
  roi_annees NUMERIC,
  economie_annuelle NUMERIC,
  
  -- Eligibility
  eligible_maprimereonov BOOLEAN DEFAULT false,
  eligible_cee BOOLEAN DEFAULT false,
  aides_disponibles JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create EDL Energy Forecasts table (simulations)
CREATE TABLE public.edl_energy_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  energy_profile_id UUID NOT NULL REFERENCES public.edl_energy_profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Scenario
  scenario_name TEXT NOT NULL,
  travaux_prevus JSONB DEFAULT '[]'::jsonb,
  
  -- Before state
  avant_classe_energie TEXT,
  avant_classe_ges TEXT,
  avant_consommation_kwh NUMERIC,
  avant_cout_annuel NUMERIC,
  avant_emissions_co2 NUMERIC,
  
  -- After state
  apres_classe_energie TEXT,
  apres_classe_ges TEXT,
  apres_consommation_kwh NUMERIC,
  apres_cout_annuel NUMERIC,
  apres_emissions_co2 NUMERIC,
  
  -- Gains
  gain_energie_kwh NUMERIC,
  gain_energie_pourcentage NUMERIC,
  economie_annuelle NUMERIC,
  reduction_co2_kg NUMERIC,
  
  -- Costs
  cout_total_travaux NUMERIC,
  roi_annees NUMERIC,
  
  -- Compliance
  atteint_re2020 BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edl_energy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_energy_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_energy_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for edl_energy_profiles
CREATE POLICY "Users can manage their energy profiles"
  ON public.edl_energy_profiles FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for edl_energy_recommendations
CREATE POLICY "Users can manage their energy recommendations"
  ON public.edl_energy_recommendations FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for edl_energy_forecasts
CREATE POLICY "Users can manage their energy forecasts"
  ON public.edl_energy_forecasts FOR ALL
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_energy_profiles_project ON public.edl_energy_profiles(project_id);
CREATE INDEX idx_energy_profiles_user ON public.edl_energy_profiles(user_id);
CREATE INDEX idx_energy_recommendations_profile ON public.edl_energy_recommendations(energy_profile_id);
CREATE INDEX idx_energy_forecasts_profile ON public.edl_energy_forecasts(energy_profile_id);

-- Trigger for updated_at
CREATE TRIGGER update_edl_energy_profiles_updated_at
  BEFORE UPDATE ON public.edl_energy_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();