import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EventType = 
  | 'photo_taken'
  | 'photo_edited'
  | 'ai_analysis'
  | 'ai_detection'
  | 'anomaly_added'
  | 'anomaly_validated'
  | 'anomaly_deleted'
  | 'task_generated'
  | 'task_validated'
  | 'task_edited'
  | 'room_completed'
  | 'room_started'
  | 'myaladin_suggestion'
  | 'myaladin_action'
  | 'description_added'
  | 'description_edited'
  | 'comparison_started'
  | 'comparison_completed'
  | 'user_edit'
  | 'sync_completed';

export type EventCategory = 
  | 'photo'
  | 'ai'
  | 'anomaly'
  | 'task'
  | 'room'
  | 'myaladin'
  | 'user'
  | 'comparison'
  | 'sync';

export interface EDLEvent {
  id: string;
  project_id: string;
  session_id: string | null;
  user_id: string;
  event_type: EventType;
  event_category: EventCategory;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  room_name: string | null;
  element_name: string | null;
  related_photo_url: string | null;
  related_anomaly_id: string | null;
  related_task_id: string | null;
  severity: string | null;
  is_ai_generated: boolean;
  created_at: string;
}

export interface TimelineFilters {
  photo: boolean;
  ai: boolean;
  anomaly: boolean;
  task: boolean;
  room: boolean;
  myaladin: boolean;
  user: boolean;
  comparison: boolean;
  criticalOnly: boolean;
  validationsOnly: boolean;
}

const defaultFilters: TimelineFilters = {
  photo: true,
  ai: true,
  anomaly: true,
  task: true,
  room: true,
  myaladin: true,
  user: true,
  comparison: true,
  criticalOnly: false,
  validationsOnly: false,
};

export const useEDLTimeline = (projectId: string, sessionId?: string) => {
  const [events, setEvents] = useState<EDLEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TimelineFilters>(defaultFilters);

  const fetchEvents = useCallback(async () => {
    if (!projectId) return;

    try {
      let query = supabase
        .from('edl_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data as EDLEvent[]) || []);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, sessionId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Real-time subscription
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`edl-events-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'edl_events',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newEvent = payload.new as EDLEvent;
          setEvents((prev) => [newEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const addEvent = useCallback(
    async (event: Omit<EDLEvent, 'id' | 'created_at' | 'user_id'>) => {
      if (!userId) return null;

      try {
        const { data, error } = await supabase
          .from('edl_events')
          .insert({
            ...event,
            user_id: userId,
          })
          .select()
          .single();

        if (error) throw error;
        return data as EDLEvent;
      } catch (error) {
        console.error('Error adding timeline event:', error);
        return null;
      }
    },
    [userId]
  );

  const filteredEvents = events.filter((event) => {
    // Category filters
    if (!filters[event.event_category as keyof TimelineFilters]) {
      return false;
    }

    // Critical only filter
    if (filters.criticalOnly && event.severity !== 'high' && event.severity !== 'critical') {
      return false;
    }

    // Validations only filter
    if (filters.validationsOnly && !event.event_type.includes('validated')) {
      return false;
    }

    return true;
  });

  // Group events by day
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = new Date(event.created_at).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, EDLEvent[]>);

  return {
    events: filteredEvents,
    groupedEvents,
    loading,
    filters,
    setFilters,
    addEvent,
    refetch: fetchEvents,
  };
};

// Helper to create common event types
export const createTimelineEvent = {
  photoTaken: (projectId: string, sessionId: string | null, roomName: string, elementName: string, photoUrl: string): Omit<EDLEvent, 'id' | 'created_at' | 'user_id'> => ({
    project_id: projectId,
    session_id: sessionId,
    event_type: 'photo_taken',
    event_category: 'photo',
    title: `Photo prise : ${elementName}`,
    description: `Photo capturée dans ${roomName}`,
    metadata: {},
    room_name: roomName,
    element_name: elementName,
    related_photo_url: photoUrl,
    related_anomaly_id: null,
    related_task_id: null,
    severity: null,
    is_ai_generated: false,
  }),

  aiAnalysis: (projectId: string, sessionId: string | null, roomName: string, result: string, isAnomalyDetected: boolean): Omit<EDLEvent, 'id' | 'created_at' | 'user_id'> => ({
    project_id: projectId,
    session_id: sessionId,
    event_type: isAnomalyDetected ? 'ai_detection' : 'ai_analysis',
    event_category: 'ai',
    title: isAnomalyDetected ? `Anomalie IA détectée` : `Analyse IA terminée`,
    description: result,
    metadata: { anomaly_detected: isAnomalyDetected },
    room_name: roomName,
    element_name: null,
    related_photo_url: null,
    related_anomaly_id: null,
    related_task_id: null,
    severity: isAnomalyDetected ? 'medium' : null,
    is_ai_generated: true,
  }),

  anomalyAdded: (projectId: string, sessionId: string | null, roomName: string, anomalyType: string, severity: string, anomalyId: string): Omit<EDLEvent, 'id' | 'created_at' | 'user_id'> => ({
    project_id: projectId,
    session_id: sessionId,
    event_type: 'anomaly_added',
    event_category: 'anomaly',
    title: `Anomalie ajoutée : ${anomalyType}`,
    description: `Nouvelle anomalie détectée dans ${roomName}`,
    metadata: { anomaly_type: anomalyType },
    room_name: roomName,
    element_name: null,
    related_photo_url: null,
    related_anomaly_id: anomalyId,
    related_task_id: null,
    severity,
    is_ai_generated: false,
  }),

  taskGenerated: (projectId: string, sessionId: string | null, taskTitle: string, roomName: string, taskId: string): Omit<EDLEvent, 'id' | 'created_at' | 'user_id'> => ({
    project_id: projectId,
    session_id: sessionId,
    event_type: 'task_generated',
    event_category: 'task',
    title: `Tâche générée : ${taskTitle}`,
    description: `Nouvelle tâche créée automatiquement`,
    metadata: {},
    room_name: roomName,
    element_name: null,
    related_photo_url: null,
    related_anomaly_id: null,
    related_task_id: taskId,
    severity: null,
    is_ai_generated: true,
  }),

  roomCompleted: (projectId: string, sessionId: string | null, roomName: string, completionPercent: number): Omit<EDLEvent, 'id' | 'created_at' | 'user_id'> => ({
    project_id: projectId,
    session_id: sessionId,
    event_type: 'room_completed',
    event_category: 'room',
    title: `${roomName} : ${completionPercent}% complété`,
    description: completionPercent >= 100 ? 'Pièce entièrement documentée' : `Progression : ${completionPercent}%`,
    metadata: { completion_percent: completionPercent },
    room_name: roomName,
    element_name: null,
    related_photo_url: null,
    related_anomaly_id: null,
    related_task_id: null,
    severity: null,
    is_ai_generated: false,
  }),

  myaladinSuggestion: (projectId: string, sessionId: string | null, suggestion: string, roomName?: string): Omit<EDLEvent, 'id' | 'created_at' | 'user_id'> => ({
    project_id: projectId,
    session_id: sessionId,
    event_type: 'myaladin_suggestion',
    event_category: 'myaladin',
    title: `MyAladin : ${suggestion.substring(0, 50)}...`,
    description: suggestion,
    metadata: {},
    room_name: roomName || null,
    element_name: null,
    related_photo_url: null,
    related_anomaly_id: null,
    related_task_id: null,
    severity: null,
    is_ai_generated: true,
  }),

  comparisonCompleted: (projectId: string, sessionId: string | null, differencesCount: number): Omit<EDLEvent, 'id' | 'created_at' | 'user_id'> => ({
    project_id: projectId,
    session_id: sessionId,
    event_type: 'comparison_completed',
    event_category: 'comparison',
    title: `Comparaison Entrée/Sortie : ${differencesCount} écarts`,
    description: `${differencesCount} différence(s) détectée(s) entre l'EDL d'entrée et de sortie`,
    metadata: { differences_count: differencesCount },
    room_name: null,
    element_name: null,
    related_photo_url: null,
    related_anomaly_id: null,
    related_task_id: null,
    severity: differencesCount > 0 ? 'medium' : null,
    is_ai_generated: true,
  }),
};
