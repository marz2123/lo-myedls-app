import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  HoloMarker, 
  HoloSession, 
  HoloPath, 
  HoloMeasurement,
  HoloEDLState,
  ARMode,
  Vector3D,
  MarkerType,
  SeverityLevel,
  MeasurementType
} from '@/types/holoedl';
import type { Json } from '@/integrations/supabase/types';

interface UseHoloEDLOptions {
  projectId: string;
  edlId?: string;
}

const initialSceneState = {
  isInitialized: false,
  isTracking: false,
  trackingQuality: 'unknown' as const,
  floorDetected: false,
  wallsDetected: 0,
  cameraPosition: { x: 0, y: 0, z: 0 },
  cameraRotation: { x: 0, y: 0, z: 0 }
};

export function useHoloEDL({ projectId, edlId }: UseHoloEDLOptions) {
  const [state, setState] = useState<HoloEDLState>({
    mode: 'standard',
    session: null,
    markers: [],
    activePath: null,
    isPlacingMarker: false,
    isMeasuring: false,
    sceneState: initialSceneState
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  // Load user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
    });
  }, []);

  // Load markers for project
  const loadMarkers = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('edl_holo_markers')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_visible', true);
      
      if (error) throw error;
      
      const markers: HoloMarker[] = (data || []).map(m => ({
        id: m.id,
        userId: m.user_id,
        projectId: m.project_id,
        edlId: m.edl_id,
        roomId: m.room_id,
        anomalyId: m.anomaly_id,
        markerType: m.marker_type as MarkerType,
        worldAnchor: m.world_anchor as Record<string, unknown>,
        coordinates: (m.coordinates as unknown as Vector3D) || { x: 0, y: 0, z: 0 },
        rotation: (m.rotation as unknown as Vector3D) || { x: 0, y: 0, z: 0 },
        scale: Number(m.scale) || 1,
        label: m.label,
        description: m.description,
        severity: (m.severity || 'info') as SeverityLevel,
        icon: m.icon,
        color: m.color || '#3B82F6',
        isVisible: m.is_visible ?? true,
        attachedMediaUrls: (m.attached_media_urls as string[]) || [],
        measurementData: m.measurement_data as unknown as HoloMarker['measurementData'],
        metadata: (m.metadata || {}) as Record<string, unknown>,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }));
      
      setState(prev => ({ ...prev, markers }));
    } catch (error) {
      console.error('Error loading markers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Start AR session
  const startSession = useCallback(async (mode: ARMode = 'standard') => {
    if (!user || !projectId) return null;
    
    try {
      const deviceInfo = {
        platform: 'web' as const,
        hasLidar: false,
        arSupported: 'xr' in navigator,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
      };
      
      const { data, error } = await supabase
        .from('edl_holo_sessions')
        .insert({
          user_id: user.id,
          project_id: projectId,
          edl_id: edlId,
          status: 'active',
          ar_mode: mode,
          device_info: deviceInfo as unknown as Json
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const session: HoloSession = {
        id: data.id,
        userId: data.user_id,
        projectId: data.project_id,
        edlId: data.edl_id,
        pathId: data.path_id,
        status: 'active',
        arMode: mode,
        deviceInfo,
        trackingQuality: 'unknown',
        markersPlaced: 0,
        measurementsTaken: 0,
        photosCaptured: 0,
        roomsCompleted: [],
        sessionData: {},
        startedAt: data.started_at
      };
      
      setState(prev => ({ 
        ...prev, 
        session, 
        mode,
        sceneState: { ...initialSceneState, isInitialized: true }
      }));
      
      await loadMarkers();
      toast.success('Session HoloEDL démarrée');
      
      return session;
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Erreur démarrage HoloEDL');
      return null;
    }
  }, [user, projectId, edlId, loadMarkers]);

  // End AR session
  const endSession = useCallback(async () => {
    if (!state.session) return;
    
    try {
      const duration = Math.floor(
        (Date.now() - new Date(state.session.startedAt).getTime()) / 1000
      );
      
      await supabase
        .from('edl_holo_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: duration
        })
        .eq('id', state.session.id);
      
      setState(prev => ({
        ...prev,
        session: null,
        sceneState: initialSceneState
      }));
      
      toast.success('Session terminée');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [state.session]);

  // Add marker
  const addMarker = useCallback(async (
    position: Vector3D,
    options: {
      type?: MarkerType;
      label?: string;
      description?: string;
      severity?: SeverityLevel;
      roomId?: string;
      anomalyId?: string;
      color?: string;
    } = {}
  ) => {
    if (!user || !projectId || !state.session) return null;
    
    try {
      const { data, error } = await supabase
        .from('edl_holo_markers')
        .insert({
          user_id: user.id,
          project_id: projectId,
          edl_id: edlId,
          room_id: options.roomId || state.currentRoom,
          anomaly_id: options.anomalyId,
          marker_type: options.type || 'annotation',
          coordinates: position as unknown as Json,
          world_anchor: {} as Json,
          label: options.label,
          description: options.description,
          severity: options.severity || 'info',
          color: options.color || '#3B82F6'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update session stats
      await supabase
        .from('edl_holo_sessions')
        .update({ markers_placed: (state.session.markersPlaced || 0) + 1 })
        .eq('id', state.session.id);
      
      await loadMarkers();
      toast.success('Marqueur ajouté');
      
      return data.id;
    } catch (error) {
      console.error('Error adding marker:', error);
      toast.error('Erreur ajout marqueur');
      return null;
    }
  }, [user, projectId, edlId, state.session, state.currentRoom, loadMarkers]);

  // Add measurement
  const addMeasurement = useCallback(async (
    startPoint: Vector3D,
    endPoint: Vector3D,
    type: MeasurementType = 'distance'
  ) => {
    if (!user || !projectId || !state.session) return null;
    
    try {
      // Calculate distance
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const dz = endPoint.z - startPoint.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const { data, error } = await supabase
        .from('edl_holo_measurements')
        .insert({
          user_id: user.id,
          session_id: state.session.id,
          project_id: projectId,
          room_id: state.currentRoom,
          measurement_type: type,
          start_point: startPoint as unknown as Json,
          end_point: endPoint as unknown as Json,
          value_meters: distance,
          value_display: `${distance.toFixed(2)} m`,
          unit: 'm'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create marker at midpoint
      const midPoint: Vector3D = {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2,
        z: (startPoint.z + endPoint.z) / 2
      };
      
      await addMarker(midPoint, {
        type: 'measurement',
        label: `${distance.toFixed(2)} m`,
        description: `Mesure ${type}`
      });
      
      // Update session stats
      await supabase
        .from('edl_holo_sessions')
        .update({ measurements_taken: (state.session.measurementsTaken || 0) + 1 })
        .eq('id', state.session.id);
      
      toast.success(`Mesure: ${distance.toFixed(2)} m`);
      return data.id;
    } catch (error) {
      console.error('Error adding measurement:', error);
      toast.error('Erreur mesure');
      return null;
    }
  }, [user, projectId, state.session, state.currentRoom, addMarker]);

  // Generate guided path
  const generateGuidedPath = useCallback(async (roomsSequence: string[]) => {
    if (!user || !projectId) return null;
    
    try {
      const waypoints = roomsSequence.map((roomId, index) => ({
        id: `waypoint-${index}`,
        position: { x: index * 2, y: 0, z: 0 },
        roomId,
        isCheckpoint: true,
        actions: [{ type: 'inspect' as const }]
      }));
      
      const { data, error } = await supabase
        .from('edl_holo_paths')
        .insert({
          user_id: user.id,
          project_id: projectId,
          edl_id: edlId,
          path_name: `Inspection ${new Date().toLocaleDateString('fr-FR')}`,
          path_type: 'inspection',
          waypoints: waypoints as unknown as Json,
          rooms_sequence: roomsSequence as unknown as Json,
          estimated_duration_minutes: roomsSequence.length * 3,
          ai_generated: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const path: HoloPath = {
        id: data.id,
        userId: data.user_id,
        projectId: data.project_id,
        edlId: data.edl_id,
        pathName: data.path_name,
        pathType: data.path_type as 'inspection',
        waypoints,
        roomsSequence,
        estimatedDurationMinutes: data.estimated_duration_minutes,
        totalDistanceMeters: data.total_distance_meters,
        isActive: data.is_active,
        completionStatus: {},
        aiGenerated: data.ai_generated,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setState(prev => ({ ...prev, activePath: path }));
      toast.success('Chemin de visite généré');
      
      return path;
    } catch (error) {
      console.error('Error generating path:', error);
      toast.error('Erreur génération chemin');
      return null;
    }
  }, [user, projectId, edlId]);

  // Switch AR mode
  const switchMode = useCallback((mode: ARMode) => {
    setState(prev => ({ ...prev, mode }));
    
    if (state.session) {
      supabase
        .from('edl_holo_sessions')
        .update({ ar_mode: mode })
        .eq('id', state.session.id);
    }
  }, [state.session]);

  // Set current room
  const setCurrentRoom = useCallback((roomId: string) => {
    setState(prev => ({ ...prev, currentRoom: roomId }));
  }, []);

  // Toggle marker placement mode
  const togglePlacingMarker = useCallback((placing: boolean) => {
    setState(prev => ({ ...prev, isPlacingMarker: placing, isMeasuring: false }));
  }, []);

  // Toggle measurement mode
  const toggleMeasuring = useCallback((measuring: boolean) => {
    setState(prev => ({ ...prev, isMeasuring: measuring, isPlacingMarker: false }));
  }, []);

  // Select marker
  const selectMarker = useCallback((marker: HoloMarker | undefined) => {
    setState(prev => ({ ...prev, selectedMarker: marker }));
  }, []);

  // Check AR support
  const isARSupported = typeof navigator !== 'undefined' && 'xr' in navigator;

  return {
    state,
    isLoading,
    isARSupported,
    startSession,
    endSession,
    addMarker,
    addMeasurement,
    generateGuidedPath,
    switchMode,
    setCurrentRoom,
    togglePlacingMarker,
    toggleMeasuring,
    selectMarker,
    loadMarkers
  };
}
