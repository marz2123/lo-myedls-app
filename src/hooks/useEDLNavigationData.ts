import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EDLRoom {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  anomaliesCount: number;
  photosCount: number;
  tasksCount: number;
  completionPercentage: number;
  elements: EDLElement[];
}

export interface EDLElement {
  id: string;
  name: string;
  type: string;
  status: 'not_done' | 'done' | 'anomaly';
  condition?: string;
  photos: EDLPhoto[];
  anomalies: EDLAnomaly[];
  description?: string;
}

export interface EDLPhoto {
  id: string;
  url: string;
  roomId?: string;
  roomName?: string;
  elementType?: string;
  elementName?: string;
  timestamp: string;
  hasAnomaly: boolean;
  hasPendingDescription: boolean;
  description?: string;
  condition?: string;
}

export interface EDLAnomaly {
  id: string;
  type: string;
  description: string;
  severity: string;
  photoUrl?: string;
}

export function useEDLNavigationData(projectId: string) {
  const [rooms, setRooms] = useState<EDLRoom[]>([]);
  const [photos, setPhotos] = useState<EDLPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // Fetch locations (rooms)
      const { data: locations } = await supabase
        .from('property_locations')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      // Fetch zones for elements
      const { data: zones } = await supabase
        .from('location_zones')
        .select('*')
        .eq('project_id', projectId);

      // Fetch sequences for completion status
      const { data: sequences } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('project_id', projectId);

      // Fetch frames (photos)
      const { data: frames } = await supabase
        .from('extracted_frames')
        .select('*, visit_sessions!inner(project_id)')
        .eq('visit_sessions.project_id', projectId);

      // Fetch anomalies
      const { data: anomalies } = await supabase
        .from('detected_anomalies')
        .select('*')
        .eq('project_id', projectId);

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('extracted_tasks')
        .select('*')
        .eq('project_id', projectId);

      // Process rooms
      const processedRooms: EDLRoom[] = (locations || []).map(location => {
        const roomZones = (zones || []).filter(z => z.location_id === location.id);
        const roomSequences = (sequences || []).filter(s => s.location_id === location.id);
        const roomFrames = (frames || []).filter(f => f.location_id === location.id);
        const roomAnomalies = (anomalies || []).filter(a => {
          const locationData = a.location_data as { location_id?: string } | null;
          return locationData?.location_id === location.id;
        });
        const roomTasks = (tasks || []).filter(t => t.location === location.name);

        // Calculate completion
        const totalElements = roomZones.length || 1;
        const completedElements = roomZones.filter(z => z.condition).length;
        const completionPercentage = Math.round((completedElements / totalElements) * 100);

        // Determine status
        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (completionPercentage === 100) {
          status = 'completed';
        } else if (completionPercentage > 0 || roomSequences.length > 0) {
          status = 'in_progress';
        }

        // Process elements
        const elements: EDLElement[] = roomZones.map(zone => {
          const zoneFrames = roomFrames.filter(f => f.zone_id === zone.id);
          const zoneAnomalies = roomAnomalies.filter(a => {
            const locationData = a.location_data as { zone_id?: string } | null;
            return locationData?.zone_id === zone.id;
          });

          return {
            id: zone.id,
            name: zone.custom_name || zone.zone_type,
            type: zone.zone_type,
            status: zoneAnomalies.length > 0 ? 'anomaly' : (zone.condition ? 'done' : 'not_done'),
            condition: zone.condition || undefined,
            photos: zoneFrames.map(f => ({
              id: f.id,
              url: f.frame_url,
              roomId: location.id,
              roomName: location.name,
              elementType: zone.zone_type,
              elementName: zone.custom_name || zone.zone_type,
              timestamp: f.created_at,
              hasAnomaly: zoneAnomalies.some(a => a.frame_id === f.id),
              hasPendingDescription: !f.manual_label,
              description: f.manual_label || undefined,
              condition: zone.condition || undefined
            })),
            anomalies: zoneAnomalies.map(a => ({
              id: a.id,
              type: a.anomaly_type,
              description: a.description,
              severity: a.severity,
              photoUrl: frames?.find(f => f.id === a.frame_id)?.frame_url
            })),
            description: zone.notes || undefined
          };
        });

        return {
          id: location.id,
          name: location.name,
          status,
          anomaliesCount: roomAnomalies.length,
          photosCount: roomFrames.length,
          tasksCount: roomTasks.length,
          completionPercentage,
          elements
        };
      });

      // Process all photos
      const allPhotos: EDLPhoto[] = (frames || []).map(frame => {
        const location = locations?.find(l => l.id === frame.location_id);
        const zone = zones?.find(z => z.id === frame.zone_id);
        const frameAnomalies = (anomalies || []).filter(a => a.frame_id === frame.id);

        return {
          id: frame.id,
          url: frame.frame_url,
          roomId: location?.id,
          roomName: location?.name,
          elementType: zone?.zone_type,
          elementName: zone?.custom_name || zone?.zone_type,
          timestamp: frame.created_at,
          hasAnomaly: frameAnomalies.length > 0,
          hasPendingDescription: !frame.manual_label,
          description: frame.manual_label || undefined,
          condition: zone?.condition || undefined
        };
      });

      setRooms(processedRooms);
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error loading EDL navigation data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('edl-navigation-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_locations' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'location_zones' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extracted_frames' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detected_anomalies' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, loadData]);

  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const completedRooms = rooms.filter(r => r.status === 'completed').length;
    const totalAnomalies = rooms.reduce((sum, r) => sum + r.anomaliesCount, 0);
    const totalPhotos = photos.length;
    const overallCompletion = totalRooms > 0 
      ? Math.round(rooms.reduce((sum, r) => sum + r.completionPercentage, 0) / totalRooms)
      : 0;

    return { totalRooms, completedRooms, totalAnomalies, totalPhotos, overallCompletion };
  }, [rooms, photos]);

  return {
    rooms,
    photos,
    loading,
    stats,
    selectedRoomId,
    setSelectedRoomId,
    refresh: loadData
  };
}
