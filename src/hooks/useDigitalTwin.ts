import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ElementState } from '@/types/digital-twin';
import { 
  DigitalTwinModel, 
  DigitalTwinUpdate, 
  DigitalTwinIoT, 
  DigitalTwinSnapshot,
  TwinViewerState 
} from '@/types/digital-twin';
import { toast } from 'sonner';

export function useDigitalTwin(projectId: string) {
  const [twin, setTwin] = useState<DigitalTwinModel | null>(null);
  const [updates, setUpdates] = useState<DigitalTwinUpdate[]>([]);
  const [iotSensors, setIotSensors] = useState<DigitalTwinIoT[]>([]);
  const [snapshots, setSnapshots] = useState<DigitalTwinSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewerState, setViewerState] = useState<TwinViewerState>({
    mode: 'structure',
    showOverlay: false,
    overlayType: 'none',
    cameraPosition: { x: 10, y: 10, z: 10 },
    cameraTarget: { x: 0, y: 0, z: 0 },
  });

  const loadTwin = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      // Fetch or create digital twin
      const { data: existingTwin, error } = await supabase
        .from('digital_twin_models')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (existingTwin) {
        setTwin(existingTwin as unknown as DigitalTwinModel);

        // Load updates
        const { data: updatesData } = await supabase
          .from('digital_twin_updates')
          .select('*')
          .eq('twin_id', existingTwin.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (updatesData) {
          setUpdates(updatesData as unknown as DigitalTwinUpdate[]);
        }

        // Load IoT sensors
        const { data: iotData } = await supabase
          .from('digital_twin_iot')
          .select('*')
          .eq('twin_id', existingTwin.id);

        if (iotData) {
          setIotSensors(iotData as unknown as DigitalTwinIoT[]);
        }

        // Load snapshots
        const { data: snapshotsData } = await supabase
          .from('digital_twin_snapshots')
          .select('*')
          .eq('twin_id', existingTwin.id)
          .order('snapshot_date', { ascending: false })
          .limit(20);

        if (snapshotsData) {
          setSnapshots(snapshotsData as unknown as DigitalTwinSnapshot[]);
        }
      }
    } catch (error) {
      console.error('Error loading digital twin:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Real-time subscription for updates
  useEffect(() => {
    if (!twin?.id) return;

    const channel = supabase
      .channel(`twin-updates-${twin.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'digital_twin_updates',
          filter: `twin_id=eq.${twin.id}`,
        },
        (payload) => {
          const newUpdate = payload.new as unknown as DigitalTwinUpdate;
          setUpdates((prev) => [newUpdate, ...prev].slice(0, 50));
          
          // Update element states in twin
          if (newUpdate.object_id && newUpdate.new_state) {
            setTwin((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                element_states: {
                  ...prev.element_states,
                  [newUpdate.object_id!]: newUpdate.new_state as any,
                },
              };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'digital_twin_iot',
          filter: `twin_id=eq.${twin.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIotSensors((prev) => [...prev, payload.new as unknown as DigitalTwinIoT]);
          } else if (payload.eventType === 'UPDATE') {
            setIotSensors((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as unknown as DigitalTwinIoT) : s))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [twin?.id]);

  useEffect(() => {
    loadTwin();
  }, [loadTwin]);

  const createTwin = async (bimModelId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('digital_twin_models')
        .insert({
          project_id: projectId,
          bim_model_id: bimModelId,
          user_id: user.id,
          sync_status: 'idle',
          element_states: {},
        })
        .select()
        .single();

      if (error) throw error;

      setTwin(data as unknown as DigitalTwinModel);
      toast.success('Jumeau numérique créé');
      return data;
    } catch (error) {
      console.error('Error creating twin:', error);
      toast.error('Erreur lors de la création du jumeau numérique');
      throw error;
    }
  };

  const syncTwin = async () => {
    if (!twin) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-digital-twin', {
        body: { twinId: twin.id, projectId },
      });

      if (error) throw error;

      await loadTwin();
      toast.success('Synchronisation terminée');
      return data;
    } catch (error) {
      console.error('Error syncing twin:', error);
      toast.error('Erreur lors de la synchronisation');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const createSnapshot = async (description?: string, isMilestone = false) => {
    if (!twin) return;

    try {
      const { data, error } = await supabase
        .from('digital_twin_snapshots')
        .insert({
          twin_id: twin.id,
          model_state: twin.json_model as any,
          element_states: twin.element_states as any,
          health_score: twin.health_score,
          description,
          is_milestone: isMilestone,
        })
        .select()
        .single();

      if (error) throw error;

      setSnapshots((prev) => [data as unknown as DigitalTwinSnapshot, ...prev]);
      toast.success('Snapshot créé');
      return data;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast.error('Erreur lors de la création du snapshot');
      throw error;
    }
  };

  const updateElement = async (objectId: string, newState: Record<string, any>, source: string = 'user') => {
    if (!twin) return;

    try {
      const oldState = twin.element_states[objectId] || {};

      const { data, error } = await supabase
        .from('digital_twin_updates')
        .insert({
          twin_id: twin.id,
          update_type: 'state_change',
          object_id: objectId,
          old_state: oldState,
          new_state: newState,
          source,
          confidence_score: source === 'user' ? 1.0 : 0.8,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setTwin((prev) => {
        if (!prev) return prev;
        const updatedStates = {
          ...prev.element_states,
          [objectId]: { ...oldState, ...newState } as ElementState,
        };
        return {
          ...prev,
          element_states: updatedStates,
        };
      });

      return data;
    } catch (error) {
      console.error('Error updating element:', error);
      throw error;
    }
  };

  const addIoTSensor = async (objectId: string, sensorType: string, sensorName?: string) => {
    if (!twin) return;

    try {
      const { data, error } = await supabase
        .from('digital_twin_iot')
        .insert({
          twin_id: twin.id,
          object_id: objectId,
          sensor_type: sensorType,
          sensor_name: sensorName,
        })
        .select()
        .single();

      if (error) throw error;

      setIotSensors((prev) => [...prev, data as unknown as DigitalTwinIoT]);
      return data;
    } catch (error) {
      console.error('Error adding IoT sensor:', error);
      throw error;
    }
  };

  return {
    twin,
    updates,
    iotSensors,
    snapshots,
    isLoading,
    isSyncing,
    viewerState,
    setViewerState,
    createTwin,
    syncTwin,
    createSnapshot,
    updateElement,
    addIoTSensor,
    refresh: loadTwin,
  };
}
