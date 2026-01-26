export type EnergyClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface EnergyProfile {
  id: string;
  project_id?: string;
  edl_id?: string;
  session_id?: string;
  bim_model_id?: string;
  user_id: string;
  
  // Classification
  classe_energie?: EnergyClass;
  classe_ges?: EnergyClass;
  
  // Consumption
  consommation_chauffage_kwh?: number;
  consommation_ecs_kwh?: number;
  consommation_electrique_kwh?: number;
  consommation_totale_kwh?: number;
  consommation_kwh_m2_an?: number;
  
  // Costs
  cout_annuel_energie?: number;
  cout_chauffage?: number;
  cout_electricite?: number;
  cout_ecs?: number;
  
  // Carbon
  emissions_co2_kg_an?: number;
  emissions_co2_kg_m2_an?: number;
  bilan_carbone?: CarbonFootprint;
  
  // Building analysis
  isolation_score?: number;
  etancheite_score?: number;
  ponts_thermiques_detectes?: ThermalBridge[];
  materiaux_detectes?: DetectedMaterial[];
  
  // Equipment
  chauffage_type?: string;
  chauffage_energie?: string;
  chauffage_rendement?: number;
  ventilation_type?: string;
  ecs_type?: string;
  menuiseries_type?: string;
  menuiseries_qualite?: string;
  
  // Compliance
  conformite_re2020?: boolean;
  conformite_rt2012?: boolean;
  score_re2020?: number;
  non_conformites?: NonConformity[];
  
  // Surfaces
  surface_habitable_m2?: number;
  surface_chauffee_m2?: number;
  volume_chauffe_m3?: number;
  hauteur_sous_plafond?: number;
  
  // Analysis
  ai_confidence_score?: number;
  analysis_metadata?: Record<string, any>;
  photos_analyzed?: number;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  analyzed_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface ThermalBridge {
  type: 'mur_plancher' | 'mur_plafond' | 'fenetre' | 'porte' | 'angle' | 'autre';
  location: string;
  severity: 'faible' | 'moyen' | 'important';
  perte_estimee_w_k?: number;
}

export interface DetectedMaterial {
  type: string;
  location: string;
  element: 'mur' | 'sol' | 'plafond' | 'menuiserie' | 'autre';
  isolation_estimee?: string;
  epaisseur_estimee?: number;
  qualite: 'bonne' | 'moyenne' | 'mauvaise';
}

export interface CarbonFootprint {
  chauffage_kg_co2: number;
  ecs_kg_co2: number;
  electricite_kg_co2: number;
  total_kg_co2: number;
  reduction_potentielle: number;
}

export interface NonConformity {
  code: string;
  description: string;
  element: string;
  norme: 'RE2020' | 'RT2012';
  severity: 'info' | 'warning' | 'error';
  recommendation: string;
}

export interface EnergyRecommendation {
  id: string;
  energy_profile_id: string;
  project_id?: string;
  user_id: string;
  
  type_travaux: string;
  categorie: 'isolation' | 'menuiseries' | 'chauffage' | 'ventilation' | 'ecs' | 'eclairage' | 'autres';
  priorite: number;
  
  titre: string;
  description?: string;
  details_techniques?: Record<string, any>;
  
  gain_kwh_m2_an?: number;
  gain_pourcentage?: number;
  nouvelle_classe_energie?: EnergyClass;
  reduction_co2_kg_an?: number;
  
  cout_estimatif_min?: number;
  cout_estimatif_max?: number;
  roi_annees?: number;
  economie_annuelle?: number;
  
  eligible_maprimereonov?: boolean;
  eligible_cee?: boolean;
  aides_disponibles?: Aid[];
  
  is_accepted?: boolean;
  accepted_at?: string;
  
  created_at: string;
}

export interface Aid {
  name: string;
  type: 'maprimereonov' | 'cee' | 'ptz' | 'autre';
  montant_estime?: number;
  conditions?: string;
}

export interface EnergyForecast {
  id: string;
  energy_profile_id: string;
  project_id?: string;
  user_id: string;
  
  scenario_name: string;
  travaux_prevus: PlannedWork[];
  
  // Before
  avant_classe_energie?: EnergyClass;
  avant_classe_ges?: EnergyClass;
  avant_consommation_kwh?: number;
  avant_cout_annuel?: number;
  avant_emissions_co2?: number;
  
  // After
  apres_classe_energie?: EnergyClass;
  apres_classe_ges?: EnergyClass;
  apres_consommation_kwh?: number;
  apres_cout_annuel?: number;
  apres_emissions_co2?: number;
  
  // Gains
  gain_energie_kwh?: number;
  gain_energie_pourcentage?: number;
  economie_annuelle?: number;
  reduction_co2_kg?: number;
  
  // Costs
  cout_total_travaux?: number;
  roi_annees?: number;
  
  atteint_re2020?: boolean;
  
  created_at: string;
}

export interface PlannedWork {
  type: string;
  description: string;
  cout_estime?: number;
  gain_estime_kwh?: number;
}

// DPE color mapping
export const DPE_COLORS: Record<EnergyClass, string> = {
  A: '#319834',
  B: '#33cc31',
  C: '#cbfc34',
  D: '#fbfe06',
  E: '#fbcc05',
  F: '#f99704',
  G: '#ee0101',
};

export const GES_COLORS: Record<EnergyClass, string> = {
  A: '#f2e6ff',
  B: '#d9b3ff',
  C: '#c080ff',
  D: '#a64dff',
  E: '#8c1aff',
  F: '#6600cc',
  G: '#4d0099',
};

export const DPE_THRESHOLDS = {
  A: { min: 0, max: 70 },
  B: { min: 71, max: 110 },
  C: { min: 111, max: 180 },
  D: { min: 181, max: 250 },
  E: { min: 251, max: 330 },
  F: { min: 331, max: 420 },
  G: { min: 421, max: Infinity },
} as const;

export const GES_THRESHOLDS = {
  A: { min: 0, max: 6 },
  B: { min: 7, max: 11 },
  C: { min: 12, max: 30 },
  D: { min: 31, max: 50 },
  E: { min: 51, max: 70 },
  F: { min: 71, max: 100 },
  G: { min: 101, max: Infinity },
} as const;
