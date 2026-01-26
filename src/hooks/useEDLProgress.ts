import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePropertyStructure } from './usePropertyStructure';

export interface RoomElement {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'done' | 'anomaly';
  photoCount: number;
  anomalyCount: number;
}

export interface StorylineRoom {
  id: string;
  name: string;
  partId: string;
  partName: string;
  partType: 'commune' | 'privative';
  locationType?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  elements: RoomElement[];
  completedElements: number;
  totalElements: number;
  anomalyCount: number;
  photoCount: number;
  hasAnomaly: boolean;
}

export interface EDLProgressData {
  rooms: StorylineRoom[];
  totalRooms: number;
  completedRooms: number;
  inProgressRooms: number;
  completionPercent: number;
  totalAnomalies: number;
  totalTasks: number;
  totalPhotos: number;
}

// Standard elements required for each room
const STANDARD_ELEMENTS = [
  { type: 'sol', name: 'Sol', icon: 'SquareSlash' },
  { type: 'mur', name: 'Murs', icon: 'Grid3x3' },
  { type: 'plafond', name: 'Plafond', icon: 'Square' },
  { type: 'menuiserie', name: 'Menuiseries', icon: 'DoorOpen' },
  { type: 'electricite', name: 'Électricité', icon: 'Zap' },
  { type: 'chauffage', name: 'Chauffage', icon: 'Flame' },
  { type: 'ventilation', name: 'Ventilation', icon: 'Wind' },
];

const BATHROOM_ELEMENTS = [
  ...STANDARD_ELEMENTS,
  { type: 'sanitaire', name: 'Sanitaires', icon: 'Droplets' },
];

export const useEDLProgress = (projectId: string | undefined) => {
  const { parts, locations, zones, loading: structureLoading } = usePropertyStructure(projectId);
  const [frames, setFrames] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch frames, anomalies, and tasks
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      // Fetch extracted frames
      const { data: framesData } = await supabase
        .from('extracted_frames')
        .select('*')
        .eq('visit_session_id', projectId);
      
      // Also try fetching by location
      const { data: framesByLocation } = await supabase
        .from('extracted_frames')
        .select('*')
        .in('location_id', locations.map(l => l.id));

      setFrames([...(framesData || []), ...(framesByLocation || [])]);

      // Fetch anomalies
      const { data: anomaliesData } = await supabase
        .from('detected_anomalies')
        .select('*')
        .eq('project_id', projectId);
      
      setAnomalies(anomaliesData || []);

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('extracted_tasks')
        .select('*')
        .eq('project_id', projectId);
      
      setTasks(tasksData || []);

    } catch (error) {
      console.error('Error fetching EDL progress data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, locations]);

  useEffect(() => {
    if (!structureLoading && locations.length > 0) {
      fetchData();
    }
  }, [fetchData, structureLoading, locations.length]);

  // Compute progress data
  const progressData = useMemo<EDLProgressData>(() => {
    const rooms: StorylineRoom[] = locations.map(loc => {
      const part = parts.find(p => p.id === loc.part_id);
      const locationZones = zones.filter(z => z.location_id === loc.id);
      const locationFrames = frames.filter(f => f.location_id === loc.id);
      const locationAnomalies = anomalies.filter(a => a.location_data?.location_id === loc.id);

      // Determine which elements apply to this room
      const isBathroom = loc.location_type?.toLowerCase().includes('sdb') || 
                         loc.location_type?.toLowerCase().includes('salle de bain') ||
                         loc.name?.toLowerCase().includes('sdb') ||
                         loc.name?.toLowerCase().includes('salle de bain');
      
      const applicableElements = isBathroom ? BATHROOM_ELEMENTS : STANDARD_ELEMENTS;

      // Build elements with status
      const elements: RoomElement[] = applicableElements.map(el => {
        const matchingZone = locationZones.find(z => z.zone_type === el.type);
        const zoneFrames = locationFrames.filter(f => f.zone_id === matchingZone?.id);
        const zoneAnomalies = locationAnomalies.filter(a => a.location_data?.zone_type === el.type);
        
        let status: 'pending' | 'done' | 'anomaly' = 'pending';
        if (zoneFrames.length > 0) {
          status = zoneAnomalies.length > 0 ? 'anomaly' : 'done';
        }

        return {
          id: matchingZone?.id || `${loc.id}-${el.type}`,
          name: el.name,
          type: el.type,
          status,
          photoCount: zoneFrames.length,
          anomalyCount: zoneAnomalies.length,
        };
      });

      const completedElements = elements.filter(e => e.status !== 'pending').length;
      const totalElements = elements.length;
      const anomalyCount = elements.reduce((sum, e) => sum + e.anomalyCount, 0);
      const photoCount = locationFrames.length;

      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (completedElements === totalElements && totalElements > 0) {
        status = 'completed';
      } else if (completedElements > 0) {
        status = 'in_progress';
      }

      return {
        id: loc.id,
        name: loc.name,
        partId: part?.id || '',
        partName: part?.name || 'Inconnu',
        partType: (part?.part_type as 'commune' | 'privative') || 'commune',
        locationType: loc.location_type,
        status,
        elements,
        completedElements,
        totalElements,
        anomalyCount,
        photoCount,
        hasAnomaly: anomalyCount > 0,
      };
    });

    const completedRooms = rooms.filter(r => r.status === 'completed').length;
    const inProgressRooms = rooms.filter(r => r.status === 'in_progress').length;
    const totalRooms = rooms.length;
    const completionPercent = totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0;

    return {
      rooms,
      totalRooms,
      completedRooms,
      inProgressRooms,
      completionPercent,
      totalAnomalies: anomalies.length,
      totalTasks: tasks.length,
      totalPhotos: frames.length,
    };
  }, [parts, locations, zones, frames, anomalies, tasks]);

  return {
    ...progressData,
    loading: loading || structureLoading,
    refresh: fetchData,
  };
};
