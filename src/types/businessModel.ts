// =====================================================
// MyEDLS Business Model Types
// Structure: Bien → Partie → Lieu → Zone → Problème → Tâche
// =====================================================

// Enums matching database types
export type PropertyPartType = 'commune' | 'privative';
export type ConditionState = 'neuf' | 'bon' | 'a_refaire';
export type ZoneType = 
  | 'murs'
  | 'sol'
  | 'plafond'
  | 'menuiseries'
  | 'electricite'
  | 'plomberie'
  | 'equipements'
  | 'ventilation'
  | 'chauffage'
  | 'facade'
  | 'toiture'
  | 'autre';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkType = 'reparation' | 'remplacement' | 'renovation' | 'entretien';
export type SequenceStatus = 'recording' | 'processing' | 'completed' | 'error';

// =====================================================
// Property Part (Partie du Bien)
// =====================================================
export interface PropertyPart {
  id: string;
  project_id: string;
  part_type: PropertyPartType;
  name: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  // Relations
  locations?: PropertyLocation[];
}

// =====================================================
// Property Location (Lieu)
// =====================================================
export interface PropertyLocation {
  id: string;
  part_id: string;
  project_id: string;
  name: string;
  location_type?: string;
  floor_level?: string;
  surface_m2?: number;
  description?: string;
  overall_condition?: ConditionState;
  order_index: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relations
  part?: PropertyPart;
  zones?: LocationZone[];
  sequences?: VisitSequence[];
}

// =====================================================
// Location Zone (Zone d'un Lieu)
// =====================================================
export interface LocationZone {
  id: string;
  location_id: string;
  project_id: string;
  zone_type: ZoneType;
  custom_name?: string;
  condition?: ConditionState;
  notes?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  // Relations
  location?: PropertyLocation;
  problems?: IdentifiedProblem[];
}

// =====================================================
// Visit Sequence (Séquence de visite)
// =====================================================
export interface VisitSequence {
  id: string;
  project_id: string;
  part_id?: string;
  location_id?: string;
  user_id: string;
  video_url?: string;
  audio_url?: string;
  photos: string[];
  transcription?: string;
  ai_analysis?: Record<string, any>;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: SequenceStatus;
  detected_condition?: ConditionState;
  user_condition?: ConditionState;
  detected_zones: ZoneType[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relations
  part?: PropertyPart;
  location?: PropertyLocation;
  problems?: IdentifiedProblem[];
}

// =====================================================
// Identified Problem (Problème identifié)
// =====================================================
export interface IdentifiedProblem {
  id: string;
  sequence_id?: string;
  project_id: string;
  location_id?: string;
  zone_id?: string;
  title: string;
  description?: string;
  severity: Severity;
  zone_type?: ZoneType;
  photo_urls: string[];
  video_timestamp_start?: number;
  video_timestamp_end?: number;
  ai_detected: boolean;
  detection_confidence?: number;
  is_confirmed: boolean;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  sequence?: VisitSequence;
  location?: PropertyLocation;
  zone?: LocationZone;
  tasks?: ProblemTask[];
}

// =====================================================
// Problem Task (Tâche FT/CT/ST liée au problème)
// =====================================================
export interface ProblemTask {
  id: string;
  problem_id: string;
  project_id: string;
  part_id?: string;
  location_id?: string;
  zone_id?: string;
  title: string;
  description?: string;
  family_id?: string;
  category_id?: string;
  subcategory_id?: string;
  classification_confidence?: number;
  condition?: ConditionState;
  quantity?: number;
  unit?: string;
  estimated_cost_min?: number;
  estimated_cost_max?: number;
  priority: TaskPriority;
  work_type?: WorkType;
  photo_urls: string[];
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  // Relations
  problem?: IdentifiedProblem;
  part?: PropertyPart;
  location?: PropertyLocation;
  zone?: LocationZone;
  // DSC classification names (joined)
  family_name?: string;
  category_name?: string;
  subcategory_name?: string;
}

// =====================================================
// Property Composition (Composition du Bien)
// =====================================================
export interface PropertyComposition {
  id: string;
  project_id: string;
  building_year?: number;
  building_type?: string;
  total_floors?: number;
  nb_apartments: number;
  nb_staircases: number;
  nb_parking_spots: number;
  nb_boxes: number;
  nb_garages: number;
  nb_facades: number;
  nb_gardens: number;
  history_notes?: string;
  previous_works?: string;
  known_issues?: string;
  constraints?: string;
  ai_suggested_structure?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Helper labels and translations
// =====================================================
export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  murs: 'Murs',
  sol: 'Sol',
  plafond: 'Plafond',
  menuiseries: 'Menuiseries',
  electricite: 'Électricité',
  plomberie: 'Plomberie',
  equipements: 'Équipements',
  ventilation: 'Ventilation',
  chauffage: 'Chauffage',
  facade: 'Façade',
  toiture: 'Toiture',
  autre: 'Autre',
};

export const CONDITION_STATE_LABELS: Record<ConditionState, string> = {
  neuf: 'Neuf',
  bon: 'Bon',
  a_refaire: 'À refaire',
};

export const CONDITION_STATE_COLORS: Record<ConditionState, string> = {
  neuf: 'bg-green-500',
  bon: 'bg-yellow-500',
  a_refaire: 'bg-red-500',
};

export const PART_TYPE_LABELS: Record<PropertyPartType, string> = {
  commune: 'Parties Communes',
  privative: 'Parties Privatives',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  reparation: 'Réparation',
  remplacement: 'Remplacement',
  renovation: 'Rénovation',
  entretien: 'Entretien',
};

// Standard location types by part type
export const COMMON_LOCATION_TYPES = [
  'facade',
  'toiture',
  'combles',
  'cage_escalier',
  'couloir',
  'hall',
  'local_technique',
  'local_poubelles',
  'cave_commune',
  'parking_commun',
];

export const PRIVATE_LOCATION_TYPES = [
  'appartement',
  'garage',
  'box',
  'parking',
  'cave',
  'jardin',
  'terrasse',
  'balcon',
];

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  facade: 'Façade',
  toiture: 'Toiture',
  combles: 'Combles',
  cage_escalier: 'Cage d\'escalier',
  couloir: 'Couloir',
  hall: 'Hall',
  local_technique: 'Local technique',
  local_poubelles: 'Local poubelles',
  cave_commune: 'Cave commune',
  parking_commun: 'Parking commun',
  appartement: 'Appartement',
  garage: 'Garage',
  box: 'Box',
  parking: 'Parking',
  cave: 'Cave',
  jardin: 'Jardin',
  terrasse: 'Terrasse',
  balcon: 'Balcon',
};
