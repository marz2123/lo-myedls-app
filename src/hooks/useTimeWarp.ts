import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  TimeWarpSnapshot,
  TimeWarpTransition,
  TimeWarpPrediction,
  TimeWarpRoomHistory,
  TimelinePoint,
  TimeWarpViewerState,
  ConditionLevel,
  TimeWarpAnomaly,
  TimeWarpFurniture,
  TimeWarpEnergy,
  TimeWarpAudio,
  RoomState,
  MaterialState,
} from '@/types/timewarp';

interface UseTimeWarpProps {
  projectId: string;
}

export function useTimeWarp({ projectId }: UseTimeWarpProps) {
  const [snapshots, setSnapshots] = useState<TimeWarpSnapshot[]>([]);
  const [transitions, setTransitions] = useState<TimeWarpTransition[]>([]);
  const [predictions, setPredictions] = useState<TimeWarpPrediction[]>([]);
  const [roomHistory, setRoomHistory] = useState<TimeWarpRoomHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<TimeWarpSnapshot | null>(null);
  const [compareSnapshot, setCompareSnapshot] = useState<TimeWarpSnapshot | null>(null);
  
  const [viewerState, setViewerState] = useState<TimeWarpViewerState>({
    mode: 'single',
    selectedYear: new Date().getFullYear(),
    isPlaying: false,
    playbackSpeed: 1,
    showAnomalies: true,
    showFurniture: true,
    showEnergy: false,
    showPredictions: true,
    cameraPosition: { x: 0, y: 5, z: 10 },
  });

  // Helper function to safely cast JSON data
  const castSnapshot = (data: any): TimeWarpSnapshot => ({
    ...data,
    anomalies_json: (data.anomalies_json as TimeWarpAnomaly[]) || [],
    furniture_json: (data.furniture_json as TimeWarpFurniture[]) || [],
    energy_json: (data.energy_json as TimeWarpEnergy) || {},
    audio_json: (data.audio_json as TimeWarpAudio[]) || [],
    materials_json: (data.materials_json as Record<string, MaterialState>) || {},
    rooms_state: (data.rooms_state as Record<string, RoomState>) || {},
    overall_condition: data.overall_condition as ConditionLevel,
    metadata: data.metadata || {},
  });

  // Load all TimeWarp data
  const loadTimeWarpData = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      // Load snapshots
      const { data: snapshotsData, error: snapshotsError } = await supabase
        .from('timewarp_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .order('snapshot_year', { ascending: true });

      if (snapshotsError) throw snapshotsError;
      setSnapshots((snapshotsData || []).map(castSnapshot));

      // Load transitions
      const { data: transitionsData, error: transitionsError } = await supabase
        .from('timewarp_transitions')
        .select('*')
        .eq('project_id', projectId)
        .order('from_year', { ascending: true });

      if (transitionsError) throw transitionsError;
      setTransitions((transitionsData || []) as unknown as TimeWarpTransition[]);

      // Load predictions
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('timewarp_predictions')
        .select('*')
        .eq('project_id', projectId)
        .order('prediction_year', { ascending: true });

      if (predictionsError) throw predictionsError;
      setPredictions((predictionsData || []) as unknown as TimeWarpPrediction[]);

      // Set initial selected snapshot
      if (snapshotsData && snapshotsData.length > 0) {
        const latestSnapshot = castSnapshot(snapshotsData[snapshotsData.length - 1]);
        setSelectedSnapshot(latestSnapshot);
        setViewerState(prev => ({ ...prev, selectedYear: latestSnapshot.snapshot_year }));
      }
    } catch (error) {
      console.error('Error loading TimeWarp data:', error);
      toast.error('Erreur lors du chargement des données TimeWarp');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTimeWarpData();
  }, [loadTimeWarpData]);

  // Generate timeline points
  const timelinePoints = useMemo((): TimelinePoint[] => {
    const points: TimelinePoint[] = [];
    const currentYear = new Date().getFullYear();

    // Add snapshot points
    snapshots.forEach(snapshot => {
      points.push({
        year: snapshot.snapshot_year,
        type: 'edl',
        snapshot_id: snapshot.id,
        label: `EDL ${snapshot.snapshot_year}`,
        condition: snapshot.overall_condition,
        health_score: snapshot.health_score ?? undefined,
        thumbnail_url: snapshot.thumbnail_url ?? undefined,
        is_current: snapshot.snapshot_year === currentYear,
      });
    });

    // Add prediction points
    predictions.forEach(prediction => {
      points.push({
        year: prediction.prediction_year,
        type: 'prediction',
        prediction_id: prediction.id,
        label: `Prévision ${prediction.prediction_year}`,
        condition: prediction.predicted_state?.overall_condition,
        health_score: prediction.predicted_state?.health_score,
        is_current: false,
      });
    });

    return points.sort((a, b) => a.year - b.year);
  }, [snapshots, predictions]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    snapshots.forEach(s => years.add(s.snapshot_year));
    predictions.forEach(p => years.add(p.prediction_year));
    return Array.from(years).sort();
  }, [snapshots, predictions]);

  // Create a new snapshot
  const createSnapshot = useCallback(async (
    year: number,
    snapshotType: 'edl' | 'predicted' | 'simulated' | 'manual' = 'manual'
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('timewarp_snapshots')
        .insert({
          project_id: projectId,
          user_id: userData.user.id,
          snapshot_year: year,
          snapshot_type: snapshotType,
          confidence_score: snapshotType === 'manual' ? 1.0 : 0.8,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newSnapshot = castSnapshot(data);
      setSnapshots(prev => [...prev, newSnapshot].sort((a, b) => a.snapshot_year - b.snapshot_year));
      toast.success(`Snapshot ${year} créé`);
      return newSnapshot;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast.error('Erreur lors de la création du snapshot');
      return null;
    }
  }, [projectId]);

  // Update snapshot
  const updateSnapshot = useCallback(async (
    snapshotId: string,
    updates: Partial<TimeWarpSnapshot>
  ) => {
    try {
      const { error } = await supabase
        .from('timewarp_snapshots')
        .update(updates as any)
        .eq('id', snapshotId);

      if (error) throw error;

      setSnapshots(prev => prev.map(s => 
        s.id === snapshotId ? { ...s, ...updates } : s
      ));
      toast.success('Snapshot mis à jour');
    } catch (error) {
      console.error('Error updating snapshot:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, []);

  // Select year for viewing
  const selectYear = useCallback((year: number) => {
    const snapshot = snapshots.find(s => s.snapshot_year === year);
    const prediction = predictions.find(p => p.prediction_year === year);
    
    if (snapshot) {
      setSelectedSnapshot(snapshot);
    } else if (prediction) {
      // Create virtual snapshot from prediction
      setSelectedSnapshot({
        id: prediction.id,
        project_id: prediction.project_id,
        user_id: prediction.user_id,
        snapshot_year: prediction.prediction_year,
        snapshot_date: prediction.created_at,
        snapshot_type: 'predicted',
        anomalies_json: prediction.predicted_anomalies as unknown as TimeWarpAnomaly[],
        furniture_json: [],
        energy_json: prediction.predicted_state?.energy || {},
        audio_json: [],
        materials_json: {},
        rooms_state: prediction.predicted_state?.rooms || {},
        overall_condition: prediction.predicted_state?.overall_condition,
        health_score: prediction.predicted_state?.health_score,
        confidence_score: prediction.confidence_level,
        metadata: {},
        created_at: prediction.created_at,
        updated_at: prediction.updated_at,
      } as TimeWarpSnapshot);
    }
    
    setViewerState(prev => ({ ...prev, selectedYear: year }));
  }, [snapshots, predictions]);

  // Enable compare mode
  const enableCompareMode = useCallback((compareYear: number) => {
    const snapshot = snapshots.find(s => s.snapshot_year === compareYear);
    if (snapshot) {
      setCompareSnapshot(snapshot);
      setViewerState(prev => ({ ...prev, mode: 'compare', compareYear }));
    }
  }, [snapshots]);

  // Exit compare mode
  const exitCompareMode = useCallback(() => {
    setCompareSnapshot(null);
    setViewerState(prev => ({ ...prev, mode: 'single', compareYear: undefined }));
  }, []);

  // Generate AI prediction for future year
  const generatePrediction = useCallback(async (targetYear: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifié');

      // Get latest snapshot as base
      const latestSnapshot = snapshots[snapshots.length - 1];
      if (!latestSnapshot) {
        toast.error('Aucun snapshot disponible pour la prédiction');
        return null;
      }

      const { data, error } = await supabase
        .from('timewarp_predictions')
        .insert({
          project_id: projectId,
          user_id: userData.user.id,
          prediction_year: targetYear,
          prediction_type: targetYear > new Date().getFullYear() ? 'future' : 'gap_fill',
          base_snapshot_id: latestSnapshot.id,
          predicted_state: {
            overall_condition: latestSnapshot.overall_condition,
            health_score: (latestSnapshot.health_score ?? 100) - (targetYear - latestSnapshot.snapshot_year) * 2,
            rooms: latestSnapshot.rooms_state,
            energy: latestSnapshot.energy_json,
          },
          confidence_level: Math.max(0.3, 1 - (targetYear - latestSnapshot.snapshot_year) * 0.1),
        } as any)
        .select()
        .single();

      if (error) throw error;

      setPredictions(prev => [...prev, data as unknown as TimeWarpPrediction].sort((a, b) => a.prediction_year - b.prediction_year));
      toast.success(`Prédiction ${targetYear} générée`);
      return data;
    } catch (error) {
      console.error('Error generating prediction:', error);
      toast.error('Erreur lors de la génération de prédiction');
      return null;
    }
  }, [projectId, snapshots]);

  // Create transition between two snapshots
  const createTransition = useCallback(async (
    fromSnapshotId: string,
    toSnapshotId: string
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifié');

      const fromSnapshot = snapshots.find(s => s.id === fromSnapshotId);
      const toSnapshot = snapshots.find(s => s.id === toSnapshotId);
      
      if (!fromSnapshot || !toSnapshot) {
        toast.error('Snapshots non trouvés');
        return null;
      }

      const { data, error } = await supabase
        .from('timewarp_transitions')
        .insert({
          project_id: projectId,
          user_id: userData.user.id,
          from_snapshot_id: fromSnapshotId,
          to_snapshot_id: toSnapshotId,
          from_year: fromSnapshot.snapshot_year,
          to_year: toSnapshot.snapshot_year,
          transition_type: 'natural',
        } as any)
        .select()
        .single();

      if (error) throw error;

      setTransitions(prev => [...prev, data as unknown as TimeWarpTransition]);
      toast.success('Transition créée');
      return data;
    } catch (error) {
      console.error('Error creating transition:', error);
      toast.error('Erreur lors de la création de transition');
      return null;
    }
  }, [projectId, snapshots]);

  // Get changes between two years
  const getChangesBetweenYears = useCallback((fromYear: number, toYear: number) => {
    const transition = transitions.find(
      t => t.from_year === fromYear && t.to_year === toYear
    );
    return transition?.changes_json || [];
  }, [transitions]);

  // Get degradation summary
  const getDegradationSummary = useMemo((): {
    totalYears: number;
    initialScore: number;
    currentScore: number;
    totalDegradation: number;
    annualDegradationRate: number;
    level: 'stable' | 'slow' | 'rapid';
  } | null => {
    if (snapshots.length < 2) return null;

    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const yearsDiff = lastSnapshot.snapshot_year - firstSnapshot.snapshot_year;
    
    const firstScore = firstSnapshot.health_score ?? 100;
    const lastScore = lastSnapshot.health_score ?? 100;
    const scoreDiff = firstScore - lastScore;
    const annualRate = yearsDiff > 0 ? scoreDiff / yearsDiff : 0;

    return {
      totalYears: yearsDiff,
      initialScore: firstScore,
      currentScore: lastScore,
      totalDegradation: scoreDiff,
      annualDegradationRate: annualRate,
      level: annualRate > 5 ? 'rapid' as const : annualRate > 2 ? 'slow' as const : 'stable' as const,
    };
  }, [snapshots]);

  // Playback controls for timeline animation
  const playTimeline = useCallback(() => {
    setViewerState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pauseTimeline = useCallback(() => {
    setViewerState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setViewerState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  // Timeline animation effect
  useEffect(() => {
    if (!viewerState.isPlaying || availableYears.length === 0) return;

    const interval = setInterval(() => {
      setViewerState(prev => {
        const currentIndex = availableYears.indexOf(prev.selectedYear);
        const nextIndex = (currentIndex + 1) % availableYears.length;
        const nextYear = availableYears[nextIndex];
        
        selectYear(nextYear);
        return { ...prev, selectedYear: nextYear };
      });
    }, 2000 / viewerState.playbackSpeed);

    return () => clearInterval(interval);
  }, [viewerState.isPlaying, viewerState.playbackSpeed, availableYears, selectYear]);

  return {
    // Data
    snapshots,
    transitions,
    predictions,
    roomHistory,
    selectedSnapshot,
    compareSnapshot,
    timelinePoints,
    availableYears,
    degradationSummary: getDegradationSummary,
    
    // State
    isLoading,
    viewerState,
    setViewerState,
    
    // Actions
    loadTimeWarpData,
    createSnapshot,
    updateSnapshot,
    selectYear,
    enableCompareMode,
    exitCompareMode,
    generatePrediction,
    createTransition,
    getChangesBetweenYears,
    
    // Playback
    playTimeline,
    pauseTimeline,
    setPlaybackSpeed,
  };
}
