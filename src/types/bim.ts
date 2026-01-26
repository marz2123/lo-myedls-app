// EDL → BIM Engine Types

export interface BIMModel {
  id: string;
  project_id: string;
  edl_id?: string;
  session_id?: string;
  user_id: string;
  
  // Model files
  ifc_url?: string;
  gltf_url?: string;
  obj_url?: string;
  usdz_url?: string;
  
  // Metadata
  accuracy_score: number;
  generation_status: 'pending' | 'processing' | 'completed' | 'failed';
  generation_progress: number;
  
  // Summary metrics
  total_rooms: number;
  total_surface_m2: number;
  total_volume_m3: number;
  total_objects: number;
  
  // AI analysis
  ai_confidence: number;
  processing_metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export interface BIMObject {
  id: string;
  model_id: string;
  room_id?: string;
  location_id?: string;
  zone_id?: string;
  
  // Type and identification
  object_type: BIMObjectType;
  object_category: 'structure' | 'opening' | 'equipment' | 'finishing';
  object_name?: string;
  
  // Geometry
  geometry: BIMGeometry;
  bounding_box: BIMBoundingBox;
  
  // Dimensions
  width?: number;
  height?: number;
  depth?: number;
  area_m2?: number;
  
  // Material
  material_type?: string;
  material_name?: string;
  color?: string;
  texture_url?: string;
  
  // State
  condition_state?: 'neuf' | 'bon' | 'moyen' | 'mauvais' | 'a_refaire';
  anomalies: BIMAnomaly[];
  linked_task_ids: string[];
  
  // AI detection
  confidence_score: number;
  detection_source: 'video' | 'photo' | 'manual' | 'plan';
  source_frame_ids: string[];
  
  created_at: string;
  updated_at: string;
}

export type BIMObjectType = 
  | 'wall' 
  | 'door' 
  | 'window' 
  | 'floor' 
  | 'ceiling' 
  | 'radiator' 
  | 'socket' 
  | 'switch' 
  | 'luminaire' 
  | 'vmc' 
  | 'sanitaire'
  | 'chauffe_eau'
  | 'chaudiere'
  | 'meuble'
  | 'plan_travail'
  | 'evier'
  | 'baignoire'
  | 'douche'
  | 'wc'
  | 'lavabo';

export interface BIMGeometry {
  vertices?: number[][];
  faces?: number[][];
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface BIMBoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface BIMAnomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface BIMSurface {
  id: string;
  model_id: string;
  room_id?: string;
  location_id?: string;
  
  // Room info
  room_name: string;
  room_type?: string;
  floor_level: number;
  
  // Dimensions
  surface_m2: number;
  perimeter_m: number;
  hauteur_sous_plafond: number;
  volume_m3: number;
  
  // Wall surfaces
  surface_murs_m2: number;
  surface_sol_m2: number;
  surface_plafond_m2: number;
  
  // Openings
  nb_portes: number;
  nb_fenetres: number;
  
  // Materials
  sol_material?: string;
  murs_material?: string;
  plafond_material?: string;
  
  // Metrics
  ml_plinthes: number;
  ml_corniches: number;
  
  // State
  global_condition?: string;
  
  created_at: string;
  updated_at: string;
}

export interface BIMProcessingQueue {
  id: string;
  model_id: string;
  project_id: string;
  user_id: string;
  
  // Status
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step?: string;
  
  // Sources
  source_frames: string[];
  source_videos: string[];
  source_plans: string[];
  
  // Results
  detected_rooms: DetectedRoom[];
  detected_objects: DetectedObject[];
  processing_log: ProcessingLogEntry[];
  error_message?: string;
  
  // Timing
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  
  created_at: string;
}

export interface DetectedRoom {
  name: string;
  type: string;
  confidence: number;
  bounds: BIMBoundingBox;
}

export interface DetectedObject {
  type: string;
  category: string;
  confidence: number;
  position: { x: number; y: number; z: number };
  dimensions?: { width: number; height: number; depth: number };
}

export interface ProcessingLogEntry {
  timestamp: string;
  step: string;
  status: 'started' | 'completed' | 'failed';
  message?: string;
}

export interface BIMExportOptions {
  format: 'ifc' | 'gltf' | 'obj' | 'usdz';
  includeTextures: boolean;
  includeAnomalies: boolean;
  includeTasks: boolean;
  simplifyGeometry: boolean;
  targetFileSize?: 'small' | 'medium' | 'large';
}

export interface BIMViewerState {
  mode: 'orbit' | 'exploded' | 'xray' | '2d';
  colorBy: 'material' | 'anomaly' | 'task' | 'condition' | 'none';
  selectedObjectId?: string;
  visibleLayers: string[];
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
}

export interface BIMMetrics {
  totalSurface: number;
  totalVolume: number;
  roomCount: number;
  objectCount: number;
  anomalyCount: number;
  taskCount: number;
  materials: { name: string; area: number }[];
  byRoom: {
    name: string;
    surface: number;
    volume: number;
    objectCount: number;
  }[];
}
