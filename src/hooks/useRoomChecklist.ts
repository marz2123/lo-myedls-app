import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StorylineRoom, RoomElement } from './useEDLProgress';

export interface ChecklistItem {
  id: string;
  type: string;
  name: string;
  icon: string;
  status: 'pending' | 'bon' | 'moyen' | 'mauvais';
  hasAnomaly: boolean;
  anomalyCount: number;
  photoUrl?: string;
  photoCount: number;
  description?: string;
  autoValidated: boolean;
  tasks: GeneratedTask[];
  anomalies: DetectedAnomaly[];
}

export interface DetectedAnomaly {
  id: string;
  type: string;
  severity: string;
  description: string;
  confidence: number;
}

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  family: string;
  category: string;
  selected: boolean;
}

export interface ChecklistSection {
  id: string;
  name: string;
  icon: string;
  items: ChecklistItem[];
  isExpanded: boolean;
  hasAnomaly: boolean;
  completedCount: number;
  totalCount: number;
}

// Room type configurations
const ROOM_ELEMENT_CONFIGS: Record<string, string[]> = {
  default: ['sol', 'mur', 'plafond', 'menuiserie', 'electricite', 'chauffage', 'ventilation'],
  bathroom: ['sol', 'mur', 'plafond', 'menuiserie', 'electricite', 'chauffage', 'ventilation', 'sanitaire', 'etancheite'],
  kitchen: ['sol', 'mur', 'plafond', 'menuiserie', 'electricite', 'chauffage', 'ventilation', 'evier', 'meubles'],
  corridor: ['sol', 'mur', 'plafond', 'menuiserie', 'electricite'],
  living: ['sol', 'mur', 'plafond', 'menuiserie', 'electricite', 'chauffage', 'ventilation'],
  bedroom: ['sol', 'mur', 'plafond', 'menuiserie', 'electricite', 'chauffage', 'ventilation'],
};

const ELEMENT_METADATA: Record<string, { name: string; icon: string }> = {
  sol: { name: 'Sol', icon: 'SquareSlash' },
  mur: { name: 'Murs', icon: 'Grid3x3' },
  plafond: { name: 'Plafond', icon: 'Square' },
  menuiserie: { name: 'Menuiseries', icon: 'DoorOpen' },
  electricite: { name: 'Électricité', icon: 'Zap' },
  chauffage: { name: 'Chauffage', icon: 'Flame' },
  ventilation: { name: 'Ventilation / VMC', icon: 'Wind' },
  sanitaire: { name: 'Sanitaires', icon: 'Droplets' },
  etancheite: { name: 'Étanchéité', icon: 'ShieldCheck' },
  evier: { name: 'Évier', icon: 'Droplets' },
  meubles: { name: 'Meubles (hauts/bas)', icon: 'Archive' },
};

function getRoomType(name: string, locationType?: string): string {
  const lower = (name + (locationType || '')).toLowerCase();
  if (lower.includes('sdb') || lower.includes('salle de bain') || lower.includes('bathroom')) {
    return 'bathroom';
  }
  if (lower.includes('cuisine') || lower.includes('kitchen')) {
    return 'kitchen';
  }
  if (lower.includes('couloir') || lower.includes('corridor') || lower.includes('entrée')) {
    return 'corridor';
  }
  if (lower.includes('salon') || lower.includes('séjour') || lower.includes('living')) {
    return 'living';
  }
  if (lower.includes('chambre') || lower.includes('bedroom')) {
    return 'bedroom';
  }
  return 'default';
}

export const useRoomChecklist = (projectId: string | undefined, roomId: string | undefined) => {
  const [room, setRoom] = useState<StorylineRoom | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch room data and checklist items
  const fetchData = useCallback(async () => {
    if (!projectId || !roomId) return;
    setLoading(true);

    try {
      // Fetch location (room) data
      const { data: locationData } = await supabase
        .from('property_locations')
        .select('*, property_parts(*)')
        .eq('id', roomId)
        .single();

      if (!locationData) {
        setLoading(false);
        return;
      }

      // Fetch zones for this location
      const { data: zonesData } = await supabase
        .from('location_zones')
        .select('*')
        .eq('location_id', roomId);

      // Fetch frames for this location
      const { data: framesData } = await supabase
        .from('extracted_frames')
        .select('*')
        .eq('location_id', roomId);

      // Fetch anomalies for this project with location data
      const { data: anomaliesData } = await supabase
        .from('detected_anomalies')
        .select('*')
        .eq('project_id', projectId);

      // Fetch tasks for this project
      const { data: tasksData } = await supabase
        .from('extracted_tasks')
        .select('*')
        .eq('project_id', projectId);

      // Determine room type and required elements
      const roomType = getRoomType(locationData.name, locationData.location_type);
      const requiredElements = ROOM_ELEMENT_CONFIGS[roomType] || ROOM_ELEMENT_CONFIGS.default;

      // Build checklist items
      const items: ChecklistItem[] = requiredElements.map(elementType => {
        const meta = ELEMENT_METADATA[elementType] || { name: elementType, icon: 'Circle' };
        const matchingZone = (zonesData || []).find(z => z.zone_type === elementType);
        const zoneFrames = (framesData || []).filter(f => f.zone_id === matchingZone?.id);
        const zoneAnomalies = (anomaliesData || []).filter(a => {
          const locData = a.location_data as Record<string, unknown> | null;
          return locData?.location_id === roomId && locData?.zone_type === elementType;
        });
        const zoneTasks = (tasksData || []).filter(
          t => t.location === roomId || t.area === elementType
        );

        // Determine status based on zone condition and photos
        let status: 'pending' | 'bon' | 'moyen' | 'mauvais' = 'pending';
        let autoValidated = false;

        if (matchingZone?.condition) {
          // Map database condition to our status
          const conditionMap: Record<string, 'bon' | 'moyen' | 'mauvais'> = {
            'neuf': 'bon',
            'bon': 'bon',
            'a_refaire': 'mauvais',
          };
          status = conditionMap[matchingZone.condition] || 'moyen';
          autoValidated = true;
        } else if (zoneFrames.length > 0) {
          // Check if any frame has analysis with condition
          const frameWithCondition = zoneFrames.find(f => {
            const analysis = f.analysis_result as Record<string, unknown> | null;
            return analysis?.condition;
          });
          if (frameWithCondition) {
            const analysis = frameWithCondition.analysis_result as Record<string, unknown>;
            status = analysis.condition as 'bon' | 'moyen' | 'mauvais';
            autoValidated = true;
          }
        }

        // If anomalies detected, status is mauvais
        if (zoneAnomalies.length > 0) {
          status = 'mauvais';
        }

        return {
          id: matchingZone?.id || `${roomId}-${elementType}`,
          type: elementType,
          name: meta.name,
          icon: meta.icon,
          status,
          hasAnomaly: zoneAnomalies.length > 0,
          anomalyCount: zoneAnomalies.length,
          photoUrl: zoneFrames[0]?.frame_url,
          photoCount: zoneFrames.length,
          description: matchingZone?.notes || '',
          autoValidated,
          tasks: zoneTasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            family: t.family_id || '',
            category: t.category_id || '',
            selected: true,
          })),
          anomalies: zoneAnomalies.map(a => ({
            id: a.id,
            type: a.anomaly_type,
            severity: a.severity,
            description: a.description,
            confidence: a.confidence_score || 0,
          })),
        };
      });

      setChecklistItems(items);

      // Build room data
      const part = locationData.property_parts;
      const completedElements = items.filter(i => i.status !== 'pending').length;
      const totalElements = items.length;
      const anomalyCount = items.reduce((sum, i) => sum + i.anomalyCount, 0);
      const photoCount = items.reduce((sum, i) => sum + i.photoCount, 0);

      let roomStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (completedElements === totalElements && totalElements > 0) {
        roomStatus = 'completed';
      } else if (completedElements > 0) {
        roomStatus = 'in_progress';
      }

      setRoom({
        id: locationData.id,
        name: locationData.name,
        partId: part?.id || '',
        partName: part?.name || 'Inconnu',
        partType: (part?.part_type as 'commune' | 'privative') || 'commune',
        locationType: locationData.location_type,
        status: roomStatus,
        elements: items.map(i => ({
          id: i.id,
          name: i.name,
          type: i.type,
          status: i.status === 'pending' ? 'pending' : i.hasAnomaly ? 'anomaly' : 'done',
          photoCount: i.photoCount,
          anomalyCount: i.anomalyCount,
        })),
        completedElements,
        totalElements,
        anomalyCount,
        photoCount,
        hasAnomaly: anomalyCount > 0,
      });

    } catch (error) {
      console.error('Error fetching room checklist:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, roomId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update item status
  const updateItemStatus = useCallback(async (itemId: string, status: 'bon' | 'moyen' | 'mauvais') => {
    setSaving(true);
    // Map our status to database condition
    const statusToCondition: Record<string, 'neuf' | 'bon' | 'a_refaire'> = {
      'bon': 'bon',
      'moyen': 'bon', // Map moyen to bon for DB
      'mauvais': 'a_refaire',
    };
    const dbCondition = statusToCondition[status];

    try {
      // Check if it's a real zone or temporary ID
      if (itemId.includes('-')) {
        // Temporary ID - need to create zone first
        const parts = itemId.split('-');
        const locationId = parts[0];
        const zoneType = parts.slice(1).join('-');
        
        // Map our element types to DB zone types
        const zoneTypeMap: Record<string, 'sol' | 'murs' | 'plafond' | 'menuiseries' | 'electricite' | 'chauffage' | 'ventilation' | 'plomberie' | 'equipements' | 'facade' | 'toiture' | 'autre'> = {
          'sol': 'sol',
          'mur': 'murs',
          'plafond': 'plafond',
          'menuiserie': 'menuiseries',
          'electricite': 'electricite',
          'chauffage': 'chauffage',
          'ventilation': 'ventilation',
          'sanitaire': 'plomberie',
          'etancheite': 'plomberie',
          'evier': 'plomberie',
          'meubles': 'equipements',
        };
        const dbZoneType = zoneTypeMap[zoneType] || 'autre';
        
        const { data: newZone } = await supabase
          .from('location_zones')
          .insert([{
            location_id: locationId,
            project_id: projectId!,
            zone_type: dbZoneType,
            condition: dbCondition,
          }])
          .select()
          .single();

        if (newZone) {
          setChecklistItems(prev => 
            prev.map(item => 
              item.id === itemId 
                ? { ...item, id: newZone.id, status, autoValidated: false }
                : item
            )
          );
        }
      } else {
        // Existing zone - update condition
        await supabase
          .from('location_zones')
          .update({ condition: dbCondition })
          .eq('id', itemId);

        setChecklistItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, status, autoValidated: false }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating item status:', error);
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  // Update item description
  const updateItemDescription = useCallback(async (itemId: string, description: string) => {
    try {
      if (!itemId.includes('-')) {
        await supabase
          .from('location_zones')
          .update({ notes: description })
          .eq('id', itemId);
      }

      setChecklistItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, description }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating description:', error);
    }
  }, []);

  // Calculate completion stats
  const stats = useMemo(() => {
    const total = checklistItems.length;
    const completed = checklistItems.filter(i => i.status !== 'pending').length;
    const withPhotos = checklistItems.filter(i => i.photoCount > 0).length;
    const anomalies = checklistItems.filter(i => i.hasAnomaly).length;
    const allCompleted = completed === total && total > 0;
    const allHavePhotos = withPhotos === total && total > 0;
    const canComplete = allCompleted && allHavePhotos;

    return {
      total,
      completed,
      withPhotos,
      anomalies,
      allCompleted,
      allHavePhotos,
      canComplete,
      completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [checklistItems]);

  return {
    room,
    checklistItems,
    loading,
    saving,
    stats,
    refresh: fetchData,
    updateItemStatus,
    updateItemDescription,
  };
};
