// TimeWarp EDL Engine Types
// Temporal 3D reconstruction and comparison system

export type SnapshotType = 'edl' | 'predicted' | 'simulated' | 'manual';
export type ConditionLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type TransitionType = 'natural' | 'renovation' | 'degradation' | 'repair' | 'replacement';
export type PredictionType = 'future' | 'gap_fill' | 'simulation';
export type DegradationLevel = 'stable' | 'slow' | 'rapid';

export interface TimeWarpSnapshot {
  id: string;
  project_id?: string;
  edl_id?: string;
  user_id: string;
  snapshot_year: number;
  snapshot_date: string;
  snapshot_type: SnapshotType;
  gltf_url?: string;
  ifc_url?: string;
  thumbnail_url?: string;
  anomalies_json: TimeWarpAnomaly[];
  furniture_json: TimeWarpFurniture[];
  energy_json: TimeWarpEnergy;
  audio_json: TimeWarpAudio[];
  materials_json: Record<string, MaterialState>;
  rooms_state: Record<string, RoomState>;
  overall_condition?: ConditionLevel;
  health_score?: number;
  confidence_score: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TimeWarpTransition {
  id: string;
  project_id?: string;
  user_id: string;
  from_snapshot_id?: string;
  to_snapshot_id?: string;
  from_year: number;
  to_year: number;
  transition_type: TransitionType;
  changes_json: TimeWarpChange[];
  anomalies_appeared: TimeWarpAnomaly[];
  anomalies_resolved: TimeWarpAnomaly[];
  works_performed: WorkPerformed[];
  degradation_rate?: number;
  improvement_score?: number;
  summary?: string;
  ai_analysis: AITransitionAnalysis;
  created_at: string;
}

export interface TimeWarpPrediction {
  id: string;
  project_id?: string;
  user_id: string;
  prediction_year: number;
  prediction_type: PredictionType;
  base_snapshot_id?: string;
  predicted_state: PredictedState;
  predicted_anomalies: PredictedAnomaly[];
  predicted_degradation: DegradationPrediction[];
  predicted_works_needed: PredictedWork[];
  confidence_level: number;
  model_version: string;
  factors_considered: string[];
  recommendations: TimeWarpRecommendation[];
  is_validated: boolean;
  validated_by?: string;
  validated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeWarpRoomHistory {
  id: string;
  project_id?: string;
  snapshot_id?: string;
  room_id: string;
  room_name?: string;
  room_type?: string;
  year: number;
  state_json: RoomState;
  materials: Record<string, MaterialState>;
  anomalies: TimeWarpAnomaly[];
  furniture: TimeWarpFurniture[];
  measurements: RoomMeasurements;
  photos: string[];
  condition?: ConditionLevel;
  created_at: string;
}

// Supporting interfaces
export interface TimeWarpAnomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: { x: number; y: number; z: number };
  room_id?: string;
  zone_type?: string;
  first_detected_year?: number;
  resolved_year?: number;
  progression: AnomalyProgression[];
  photos: string[];
  measurements?: { width?: number; height?: number; depth?: number };
}

export interface AnomalyProgression {
  year: number;
  state: 'new' | 'stable' | 'worsening' | 'improving' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

export interface TimeWarpFurniture {
  id: string;
  name: string;
  type: string;
  room_id: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  condition: ConditionLevel;
  material?: string;
  color?: string;
  installed_year?: number;
  replaced_year?: number;
}

export interface TimeWarpEnergy {
  dpe_class?: string;
  ges_class?: string;
  consumption_kwh?: number;
  heating_type?: string;
  insulation_quality?: string;
  windows_type?: string;
}

export interface TimeWarpAudio {
  id: string;
  url: string;
  transcription?: string;
  room_id?: string;
  timestamp: string;
}

export interface MaterialState {
  type: string;
  color?: string;
  condition: ConditionLevel;
  installed_year?: number;
  last_renovation?: number;
}

export interface RoomState {
  id: string;
  name: string;
  type: string;
  condition: ConditionLevel;
  surfaces: {
    walls: SurfaceState;
    floor: SurfaceState;
    ceiling: SurfaceState;
  };
  equipment: EquipmentState[];
  anomalies_count: number;
  last_renovation?: number;
}

export interface SurfaceState {
  material: string;
  color?: string;
  condition: ConditionLevel;
  area_m2?: number;
}

export interface EquipmentState {
  id: string;
  type: string;
  name: string;
  condition: ConditionLevel;
  installed_year?: number;
}

export interface RoomMeasurements {
  area_m2?: number;
  volume_m3?: number;
  height_m?: number;
  perimeter_m?: number;
}

export interface TimeWarpChange {
  id: string;
  type: 'material' | 'equipment' | 'structure' | 'anomaly' | 'furniture';
  room_id?: string;
  zone_type?: string;
  description: string;
  before_state: any;
  after_state: any;
  change_type: 'addition' | 'removal' | 'modification' | 'degradation' | 'improvement';
}

export interface WorkPerformed {
  id: string;
  type: string;
  description: string;
  room_id?: string;
  zone_type?: string;
  date_completed?: string;
  cost?: number;
  contractor?: string;
  family_code?: string;
  category_code?: string;
}

export interface AITransitionAnalysis {
  summary: string;
  key_changes: string[];
  degradation_patterns: string[];
  improvement_areas: string[];
  risk_factors: string[];
  recommendations: string[];
}

export interface PredictedState {
  overall_condition: ConditionLevel;
  health_score: number;
  rooms: Record<string, RoomState>;
  energy: TimeWarpEnergy;
}

export interface PredictedAnomaly {
  type: string;
  probability: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  prevention_action?: string;
}

export interface DegradationPrediction {
  element: string;
  room_id?: string;
  current_condition: ConditionLevel;
  predicted_condition: ConditionLevel;
  degradation_rate: DegradationLevel;
  years_until_critical?: number;
  maintenance_recommendation?: string;
}

export interface PredictedWork {
  type: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimated_cost_min?: number;
  estimated_cost_max?: number;
  recommended_year?: number;
  family_code?: string;
}

export interface TimeWarpRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  action: string;
  estimated_cost?: number;
  roi_years?: number;
}

// Timeline display types
export interface TimelinePoint {
  year: number;
  type: 'edl' | 'prediction' | 'work' | 'event';
  snapshot_id?: string;
  prediction_id?: string;
  label: string;
  condition?: ConditionLevel;
  health_score?: number;
  thumbnail_url?: string;
  is_current: boolean;
}

export interface TimeWarpViewerState {
  mode: 'single' | 'compare' | 'timeline' | 'ar';
  selectedYear: number;
  compareYear?: number;
  isPlaying: boolean;
  playbackSpeed: number;
  showAnomalies: boolean;
  showFurniture: boolean;
  showEnergy: boolean;
  showPredictions: boolean;
  selectedRoom?: string;
  cameraPosition: { x: number; y: number; z: number };
}

// Constants
export const CONDITION_COLORS: Record<ConditionLevel, string> = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#f59e0b',
  poor: '#f97316',
  critical: '#ef4444',
};

export const DEGRADATION_COLORS: Record<DegradationLevel, string> = {
  stable: '#22c55e',
  slow: '#f59e0b',
  rapid: '#ef4444',
};

export const TRANSITION_ICONS: Record<TransitionType, string> = {
  natural: '🕐',
  renovation: '🔨',
  degradation: '📉',
  repair: '🔧',
  replacement: '🔄',
};
