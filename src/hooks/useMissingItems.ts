import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MissingCategory = 
  | 'photo_missing'
  | 'description_missing'
  | 'task_not_validated'
  | 'state_not_set'
  | 'anomaly_not_confirmed'
  | 'partial_completion'
  | 'mandatory_not_done'
  | 'ai_data_ignored';

export type MissingSeverity = 'blocking' | 'missing' | 'recommended';

export interface MissingItem {
  id: string;
  category: MissingCategory;
  severity: MissingSeverity;
  roomId: string;
  roomName: string;
  elementId?: string;
  elementName: string;
  elementType?: string;
  label: string;
  description: string;
  actionType: 'add_photo' | 'add_description' | 'validate_task' | 'set_state' | 'confirm_anomaly' | 'auto_complete' | 'ignore';
  metadata?: Record<string, any>;
}

export interface MissingRoomSummary {
  roomId: string;
  roomName: string;
  totalMissing: number;
  blocking: number;
  missing: number;
  recommended: number;
  progress: number;
  items: MissingItem[];
}

export interface MissingSummary {
  totalMissing: number;
  totalBlocking: number;
  totalRooms: number;
  roomsWithMissing: number;
  completionPercent: number;
  byCategory: Record<MissingCategory, number>;
  rooms: MissingRoomSummary[];
}

// Mandatory items by room type
const MANDATORY_ITEMS_BY_ROOM: Record<string, string[]> = {
  'salle_de_bain': ['sanitaires', 'vmc', 'sol', 'murs', 'plafond', 'miroir'],
  'cuisine': ['evier', 'plan_de_travail', 'prises', 'sol', 'murs', 'plafond', 'hotte'],
  'chambre': ['fenetres', 'interrupteurs', 'sol', 'murs', 'plafond', 'prises'],
  'sejour': ['fenetres', 'interrupteurs', 'sol', 'murs', 'plafond', 'prises', 'chauffage'],
  'entree': ['sol', 'murs', 'plafond', 'interrupteurs', 'porte'],
  'wc': ['sanitaires', 'sol', 'murs', 'plafond'],
  'default': ['sol', 'murs', 'plafond']
};

const CATEGORY_LABELS: Record<MissingCategory, string> = {
  photo_missing: 'Photo manquante',
  description_missing: 'Description manquante',
  task_not_validated: 'Tâche non validée',
  state_not_set: 'État non renseigné',
  anomaly_not_confirmed: 'Anomalie non confirmée',
  partial_completion: 'Partiellement complété',
  mandatory_not_done: 'Élément obligatoire non fait',
  ai_data_ignored: 'Données IA ignorées'
};

const CATEGORY_ICONS: Record<MissingCategory, string> = {
  photo_missing: '📸',
  description_missing: '📝',
  task_not_validated: '🔧',
  state_not_set: '✓',
  anomaly_not_confirmed: '❗',
  partial_completion: '🟨',
  mandatory_not_done: '🚫',
  ai_data_ignored: '🧩'
};

export function useMissingItems(projectId: string) {
  const [isScanning, setIsScanning] = useState(false);
  const [summary, setSummary] = useState<MissingSummary | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const scanMissingItems = useCallback(async () => {
    setIsScanning(true);
    
    try {
      // Fetch all relevant data
      const [
        { data: locations },
        { data: zones },
        { data: frames },
        { data: anomalies },
        { data: tasks },
        { data: sequences }
      ] = await Promise.all([
        supabase.from('property_locations').select('*').eq('project_id', projectId),
        supabase.from('location_zones').select('*').eq('project_id', projectId),
        supabase.from('extracted_frames').select('*, visit_sessions!inner(project_id)').eq('visit_sessions.project_id', projectId),
        supabase.from('detected_anomalies').select('*').eq('project_id', projectId),
        supabase.from('extracted_tasks').select('*').eq('project_id', projectId),
        supabase.from('visit_sequences').select('*').eq('project_id', projectId)
      ]);

      const missingItems: MissingItem[] = [];
      const roomSummaries: MissingRoomSummary[] = [];

      // Process each location (room)
      for (const location of locations || []) {
        const roomItems: MissingItem[] = [];
        const roomZones = (zones || []).filter(z => z.location_id === location.id);
        const roomFrames = (frames || []).filter(f => f.location_id === location.id);
        const roomAnomalies = (anomalies || []).filter(a => (a.location_data as any)?.location_id === location.id);
        const roomTasks = (tasks || []).filter(t => t.location === location.name);

        // Determine room type for mandatory items
        const roomType = location.location_type?.toLowerCase() || 'default';
        const mandatoryItems = MANDATORY_ITEMS_BY_ROOM[roomType] || MANDATORY_ITEMS_BY_ROOM.default;

        // Check mandatory elements
        for (const mandatory of mandatoryItems) {
          const hasZone = roomZones.some(z => 
            z.zone_type?.toLowerCase().includes(mandatory) || 
            z.custom_name?.toLowerCase().includes(mandatory)
          );
          const hasPhoto = roomFrames.some(f => 
            (f.edl_tags as any)?.element_type?.toLowerCase().includes(mandatory)
          );

          if (!hasZone && !hasPhoto) {
            roomItems.push({
              id: `${location.id}-mandatory-${mandatory}`,
              category: 'mandatory_not_done',
              severity: 'blocking',
              roomId: location.id,
              roomName: location.name || 'Pièce',
              elementName: mandatory.charAt(0).toUpperCase() + mandatory.slice(1),
              elementType: mandatory,
              label: `${mandatory.charAt(0).toUpperCase() + mandatory.slice(1)} – élément obligatoire`,
              description: `L'élément "${mandatory}" est obligatoire pour ce type de pièce`,
              actionType: 'add_photo'
            });
          }
        }

        // Check zones without photos
        for (const zone of roomZones) {
          const zonePhotos = roomFrames.filter(f => f.zone_id === zone.id);
          
          if (zonePhotos.length === 0) {
            roomItems.push({
              id: `${zone.id}-photo`,
              category: 'photo_missing',
              severity: 'missing',
              roomId: location.id,
              roomName: location.name || 'Pièce',
              elementId: zone.id,
              elementName: zone.custom_name || zone.zone_type || 'Zone',
              elementType: zone.zone_type,
              label: `${zone.custom_name || zone.zone_type} – photo manquante`,
              description: 'Aucune photo pour cet élément',
              actionType: 'add_photo'
            });
          }

          // Check zones without condition state
          if (!zone.condition) {
            roomItems.push({
              id: `${zone.id}-state`,
              category: 'state_not_set',
              severity: 'missing',
              roomId: location.id,
              roomName: location.name || 'Pièce',
              elementId: zone.id,
              elementName: zone.custom_name || zone.zone_type || 'Zone',
              elementType: zone.zone_type,
              label: `${zone.custom_name || zone.zone_type} – état non renseigné`,
              description: 'L\'état (Bon/Moyen/Mauvais) n\'est pas défini',
              actionType: 'set_state'
            });
          }

          // Check zones with "a_refaire" state without justification photo
          if (zone.condition === 'a_refaire' && zonePhotos.length < 2) {
            roomItems.push({
              id: `${zone.id}-justif`,
              category: 'partial_completion',
              severity: 'recommended',
              roomId: location.id,
              roomName: location.name || 'Pièce',
              elementId: zone.id,
              elementName: zone.custom_name || zone.zone_type || 'Zone',
              elementType: zone.zone_type,
              label: `${zone.custom_name || zone.zone_type} – justificatif recommandé`,
              description: 'État "Moyen" sans photo de justificatif',
              actionType: 'add_photo'
            });
          }
        }

        // Check unconfirmed anomalies
        for (const anomaly of roomAnomalies) {
          if (!anomaly.is_confirmed) {
            roomItems.push({
              id: `${anomaly.id}-confirm`,
              category: 'anomaly_not_confirmed',
              severity: 'blocking',
              roomId: location.id,
              roomName: location.name || 'Pièce',
              elementId: anomaly.id,
              elementName: anomaly.anomaly_type || 'Anomalie',
              label: `${anomaly.anomaly_type} – anomalie non confirmée`,
              description: anomaly.description || 'Anomalie détectée par l\'IA à confirmer',
              actionType: 'confirm_anomaly',
              metadata: { anomalyId: anomaly.id }
            });
          }
        }

        // Check unvalidated tasks
        const unvalidatedTasks = roomTasks.filter(t => 
          (t.analysis_metadata as any)?.aiGenerated && 
          !(t.analysis_metadata as any)?.validated
        );
        for (const task of unvalidatedTasks) {
          roomItems.push({
            id: `${task.id}-validate`,
            category: 'task_not_validated',
            severity: 'recommended',
            roomId: location.id,
            roomName: location.name || 'Pièce',
            elementId: task.id,
            elementName: task.title,
            label: `${task.title} – tâche non validée`,
            description: task.description || 'Tâche générée par l\'IA à valider',
            actionType: 'validate_task',
            metadata: { taskId: task.id }
          });
        }

        // Calculate room progress
        const totalElements = mandatoryItems.length + roomZones.length;
        const completedElements = roomZones.filter(z => z.condition && 
          roomFrames.some(f => f.zone_id === z.id)
        ).length;
        const progress = totalElements > 0 ? Math.round((completedElements / totalElements) * 100) : 0;

        if (roomItems.length > 0) {
          roomSummaries.push({
            roomId: location.id,
            roomName: location.name || 'Pièce',
            totalMissing: roomItems.length,
            blocking: roomItems.filter(i => i.severity === 'blocking').length,
            missing: roomItems.filter(i => i.severity === 'missing').length,
            recommended: roomItems.filter(i => i.severity === 'recommended').length,
            progress,
            items: roomItems
          });
        }

        missingItems.push(...roomItems);
      }

      // Calculate category counts
      const byCategory: Record<MissingCategory, number> = {
        photo_missing: 0,
        description_missing: 0,
        task_not_validated: 0,
        state_not_set: 0,
        anomaly_not_confirmed: 0,
        partial_completion: 0,
        mandatory_not_done: 0,
        ai_data_ignored: 0
      };

      for (const item of missingItems) {
        byCategory[item.category]++;
      }

      const totalRooms = (locations || []).length;
      const roomsWithMissing = roomSummaries.length;
      const completionPercent = totalRooms > 0 
        ? Math.round(((totalRooms - roomsWithMissing) / totalRooms) * 100)
        : 100;

      setSummary({
        totalMissing: missingItems.length,
        totalBlocking: missingItems.filter(i => i.severity === 'blocking').length,
        totalRooms,
        roomsWithMissing,
        completionPercent,
        byCategory,
        rooms: roomSummaries.sort((a, b) => b.blocking - a.blocking)
      });

      setLastScanTime(new Date());
    } catch (error) {
      console.error('Error scanning missing items:', error);
    } finally {
      setIsScanning(false);
    }
  }, [projectId]);

  // Real-time subscriptions
  useEffect(() => {
    const channels = [
      supabase.channel('missing-frames')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'extracted_frames' }, () => {
          scanMissingItems();
        })
        .subscribe(),
      supabase.channel('missing-zones')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'location_zones' }, () => {
          scanMissingItems();
        })
        .subscribe(),
      supabase.channel('missing-anomalies')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'detected_anomalies' }, () => {
          scanMissingItems();
        })
        .subscribe(),
      supabase.channel('missing-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'extracted_tasks' }, () => {
          scanMissingItems();
        })
        .subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [scanMissingItems]);

  // Action handlers
  const markAsDone = useCallback(async (item: MissingItem) => {
    if (item.elementId && item.category === 'state_not_set') {
      await supabase
        .from('location_zones')
        .update({ condition: 'bon' })
        .eq('id', item.elementId);
    }
    scanMissingItems();
  }, [scanMissingItems]);

  const confirmAnomaly = useCallback(async (item: MissingItem) => {
    if (item.metadata?.anomalyId) {
      await supabase
        .from('detected_anomalies')
        .update({ is_confirmed: true, confirmed_at: new Date().toISOString() })
        .eq('id', item.metadata.anomalyId);
    }
    scanMissingItems();
  }, [scanMissingItems]);

  const validateTask = useCallback(async (item: MissingItem) => {
    if (item.metadata?.taskId) {
      const { data: task } = await supabase
        .from('extracted_tasks')
        .select('analysis_metadata')
        .eq('id', item.metadata.taskId)
        .single();
      
      const metadata = (task?.analysis_metadata as Record<string, any>) || {};
      await supabase
        .from('extracted_tasks')
        .update({ 
          analysis_metadata: { ...metadata, validated: true, validatedAt: new Date().toISOString() }
        })
        .eq('id', item.metadata.taskId);
    }
    scanMissingItems();
  }, [scanMissingItems]);

  const ignoreItem = useCallback(async (item: MissingItem, reason: string) => {
    // Store ignored items in localStorage for now
    const ignoredKey = `edl_ignored_${projectId}`;
    const ignored = JSON.parse(localStorage.getItem(ignoredKey) || '[]');
    ignored.push({ itemId: item.id, reason, ignoredAt: new Date().toISOString() });
    localStorage.setItem(ignoredKey, JSON.stringify(ignored));
    scanMissingItems();
  }, [projectId, scanMissingItems]);

  return {
    isScanning,
    summary,
    lastScanTime,
    scanMissingItems,
    markAsDone,
    confirmAnomaly,
    validateTask,
    ignoreItem,
    CATEGORY_LABELS,
    CATEGORY_ICONS
  };
}
