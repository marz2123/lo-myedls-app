// Multi-Unit EDL Types

export type UnitType = 'apartment' | 'cave' | 'garage' | 'parking' | 'storage' | 'commercial' | 'technical' | 'common_area';
export type ApartmentType = 'studio' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'duplex' | 'loft';
export type EDLStatus = 'pending' | 'in_progress' | 'completed' | 'signed' | 'critical';
export type OccupantType = 'tenant' | 'owner' | 'vacant' | 'unknown';
export type BuildingStatus = 'pending' | 'in_progress' | 'completed' | 'archived';

export interface MultiunitBuilding {
  id: string;
  project_id?: string;
  user_id: string;
  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  owner_company?: string;
  manager_company?: string;
  total_units: number;
  total_floors: number;
  construction_year?: number;
  building_type: string;
  common_areas_count: number;
  annexes_count: number;
  global_status: BuildingStatus;
  global_quality_score?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MultiunitUnit {
  id: string;
  building_id: string;
  user_id: string;
  unit_number: string;
  unit_type: UnitType;
  apartment_type?: ApartmentType;
  floor_number: number;
  surface_m2?: number;
  occupant_name?: string;
  occupant_type: OccupantType;
  edl_status: EDLStatus;
  entry_edl_id?: string;
  exit_edl_id?: string;
  quality_score?: number;
  is_template: boolean;
  template_source_id?: string;
  similarity_group?: string;
  similarity_score?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MultiunitEDLLink {
  id: string;
  unit_id: string;
  edl_id?: string;
  session_id?: string;
  link_type: 'entry' | 'exit' | 'technical';
  status: string;
  completed_at?: string;
  quality_score?: number;
  anomalies_count: number;
  tasks_count: number;
  photos_count: number;
  created_at: string;
}

export interface MultiunitAnalysis {
  id: string;
  building_id: string;
  unit_id?: string;
  analysis_type: string;
  result_json: Record<string, any>;
  similarity_matches: SimilarityMatch[];
  detected_patterns: DetectedPattern[];
  recommendations: string[];
  confidence_score?: number;
  processing_time_ms?: number;
  created_at: string;
}

export interface SimilarityMatch {
  source_unit_id: string;
  target_unit_id: string;
  similarity_score: number;
  matching_elements: string[];
  differences: string[];
}

export interface DetectedPattern {
  pattern_type: string;
  affected_units: string[];
  description: string;
  recommendation?: string;
}

export interface MultiunitReport {
  id: string;
  building_id: string;
  user_id: string;
  report_type: 'global' | 'floor' | 'type' | 'comparison';
  report_json: Record<string, any>;
  summary_stats: BuildingSummaryStats;
  floor_summaries: FloorSummary[];
  type_summaries: TypeSummary[];
  global_anomalies: any[];
  global_tasks: any[];
  pdf_url?: string;
  dpgf_url?: string;
  planning_url?: string;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BuildingSummaryStats {
  total_units: number;
  completed_units: number;
  pending_units: number;
  in_progress_units: number;
  critical_units: number;
  total_anomalies: number;
  total_tasks: number;
  average_quality_score: number;
  estimated_budget_min?: number;
  estimated_budget_max?: number;
}

export interface FloorSummary {
  floor_number: number;
  units_count: number;
  completed_count: number;
  anomalies_count: number;
  tasks_count: number;
  average_score: number;
}

export interface TypeSummary {
  apartment_type: ApartmentType;
  units_count: number;
  completed_count: number;
  anomalies_count: number;
  average_score: number;
}

export interface ProcessingQueueItem {
  id: string;
  building_id: string;
  unit_id?: string;
  user_id: string;
  task_type: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  result_json?: Record<string, any>;
  created_at: string;
}

// UI Helper types
export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  apartment: 'Appartement',
  cave: 'Cave',
  garage: 'Garage',
  parking: 'Parking',
  storage: 'Cellier',
  commercial: 'Local commercial',
  technical: 'Local technique',
  common_area: 'Partie commune'
};

export const APARTMENT_TYPE_LABELS: Record<ApartmentType, string> = {
  studio: 'Studio',
  T1: 'T1',
  T2: 'T2',
  T3: 'T3',
  T4: 'T4',
  T5: 'T5',
  T6: 'T6+',
  duplex: 'Duplex',
  loft: 'Loft'
};

export const EDL_STATUS_LABELS: Record<EDLStatus, string> = {
  pending: 'À faire',
  in_progress: 'En cours',
  completed: 'Terminé',
  signed: 'Signé',
  critical: 'Critique'
};

export const EDL_STATUS_COLORS: Record<EDLStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  signed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};
