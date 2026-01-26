export interface DigitalTwinModel {
  id: string;
  project_id?: string;
  edl_id?: string;
  bim_model_id?: string;
  user_id: string;
  model_version: number;
  json_model: Record<string, any>;
  ifc_url?: string;
  gltf_url?: string;
  usdz_url?: string;
  sync_status: 'idle' | 'syncing' | 'error' | 'completed';
  last_sync_at?: string;
  sync_sources: string[];
  element_states: Record<string, ElementState>;
  total_elements: number;
  total_anomalies: number;
  total_tasks: number;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface ElementState {
  id: string;
  type: string;
  name: string;
  status: 'normal' | 'warning' | 'critical' | 'repaired' | 'analyzing';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  lastUpdated: string;
  anomalies: string[];
  tasks: string[];
  iotSensors: string[];
  position?: { x: number; y: number; z: number };
  dimensions?: { width: number; height: number; depth: number };
  material?: string;
  color?: string;
}

export interface DigitalTwinUpdate {
  id: string;
  twin_id: string;
  update_type: 'state_change' | 'anomaly' | 'task' | 'iot' | 'photo' | 'video' | 'camera' | 'intervention';
  object_id?: string;
  object_type?: string;
  old_state?: Record<string, any>;
  new_state?: Record<string, any>;
  source: 'edl' | 'autopilot' | 'photo' | 'iot' | 'camera' | 'user' | 'ai';
  source_id?: string;
  confidence_score: number;
  is_validated: boolean;
  validated_by?: string;
  validated_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DigitalTwinIoT {
  id: string;
  twin_id: string;
  object_id: string;
  sensor_type: 'temperature' | 'humidity' | 'motion' | 'door' | 'window' | 'leak' | 'smoke' | 'co2';
  sensor_name?: string;
  last_value?: number;
  unit?: string;
  threshold_min?: number;
  threshold_max?: number;
  alert_status: 'normal' | 'warning' | 'critical';
  last_update: string;
  history: IoTReading[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface IoTReading {
  value: number;
  timestamp: string;
}

export interface DigitalTwinSnapshot {
  id: string;
  twin_id: string;
  snapshot_date: string;
  model_state: Record<string, any>;
  element_states: Record<string, ElementState>;
  anomalies_snapshot: any[];
  tasks_snapshot: any[];
  iot_snapshot: any[];
  health_score?: number;
  description?: string;
  is_milestone: boolean;
  created_at: string;
}

export type TwinViewMode = 
  | 'structure' 
  | 'materials' 
  | 'anomalies' 
  | 'tasks' 
  | 'maintenance' 
  | 'iot' 
  | 'energy' 
  | 'before_after' 
  | 'timeline';

export interface TwinViewerState {
  mode: TwinViewMode;
  selectedElement?: string;
  showOverlay: boolean;
  overlayType: 'none' | 'anomalies' | 'tasks' | 'iot';
  timelineDate?: string;
  compareDate?: string;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
}

export const STATUS_COLORS = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  repaired: '#3b82f6',
  analyzing: '#8b5cf6',
} as const;

export const CONDITION_COLORS = {
  excellent: '#22c55e',
  good: '#84cc16',
  fair: '#f59e0b',
  poor: '#f97316',
  critical: '#ef4444',
} as const;

export const IOT_COLORS = {
  temperature: '#ef4444',
  humidity: '#3b82f6',
  motion: '#f59e0b',
  door: '#8b5cf6',
  window: '#06b6d4',
  leak: '#0ea5e9',
  smoke: '#6b7280',
  co2: '#84cc16',
} as const;
