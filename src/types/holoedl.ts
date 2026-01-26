export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type MarkerType = 
  | 'annotation'
  | 'anomaly'
  | 'measurement'
  | 'waypoint'
  | 'photo_marker'
  | 'task'
  | 'comparison';

export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type MeasurementType = 
  | 'distance'
  | 'area'
  | 'height'
  | 'width'
  | 'depth'
  | 'volume'
  | 'crack_length'
  | 'stain_size';

export type ARMode = 'standard' | 'xray' | 'comparison' | 'guided' | 'measurement';

export type TrackingQuality = 'unknown' | 'limited' | 'normal' | 'excellent';

export interface HoloMarker {
  id: string;
  userId: string;
  projectId: string;
  edlId?: string;
  roomId?: string;
  anomalyId?: string;
  markerType: MarkerType;
  worldAnchor: Record<string, unknown>;
  coordinates: Vector3D;
  rotation: Vector3D;
  scale: number;
  label?: string;
  description?: string;
  severity: SeverityLevel;
  icon?: string;
  color: string;
  isVisible: boolean;
  attachedMediaUrls: string[];
  measurementData?: MeasurementData;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementData {
  type: MeasurementType;
  value: number;
  unit: string;
  displayValue: string;
  accuracy?: number;
}

export interface HoloPath {
  id: string;
  userId: string;
  projectId: string;
  edlId?: string;
  pathName: string;
  pathType: 'inspection' | 'guided' | 'custom';
  waypoints: PathWaypoint[];
  roomsSequence: string[];
  estimatedDurationMinutes?: number;
  totalDistanceMeters?: number;
  isActive: boolean;
  completionStatus: Record<string, boolean>;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PathWaypoint {
  id: string;
  position: Vector3D;
  roomId?: string;
  label?: string;
  isCheckpoint: boolean;
  actions?: WaypointAction[];
}

export interface WaypointAction {
  type: 'photo' | 'inspect' | 'measure' | 'annotate';
  target?: string;
  completed?: boolean;
}

export interface HoloSession {
  id: string;
  userId: string;
  projectId: string;
  edlId?: string;
  pathId?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  arMode: ARMode;
  deviceInfo: DeviceInfo;
  trackingQuality: TrackingQuality;
  markersPlaced: number;
  measurementsTaken: number;
  photosCaptured: number;
  roomsCompleted: string[];
  sessionData: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  hasLidar: boolean;
  arSupported: boolean;
  screenWidth: number;
  screenHeight: number;
}

export interface HoloMeasurement {
  id: string;
  userId: string;
  sessionId: string;
  projectId: string;
  roomId?: string;
  measurementType: MeasurementType;
  startPoint: Vector3D;
  endPoint?: Vector3D;
  valueMeters: number;
  valueDisplay: string;
  unit: string;
  accuracyConfidence?: number;
  linkedAnomalyId?: string;
  linkedMarkerId?: string;
  screenshotUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ARSceneState {
  isInitialized: boolean;
  isTracking: boolean;
  trackingQuality: TrackingQuality;
  floorDetected: boolean;
  wallsDetected: number;
  lightEstimate?: number;
  cameraPosition: Vector3D;
  cameraRotation: Vector3D;
}

export interface HoloEDLState {
  mode: ARMode;
  session: HoloSession | null;
  markers: HoloMarker[];
  activePath: HoloPath | null;
  currentRoom?: string;
  selectedMarker?: HoloMarker;
  isPlacingMarker: boolean;
  isMeasuring: boolean;
  measurementStart?: Vector3D;
  sceneState: ARSceneState;
}
