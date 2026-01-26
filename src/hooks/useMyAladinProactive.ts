import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProactiveSuggestion {
  id: string;
  type: 'missing_photo' | 'missing_description' | 'anomaly_detected' | 'room_completion' | 'task_suggestion' | 'validation_needed' | 'inactivity';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  action?: {
    label: string;
    type: 'navigate' | 'create_task' | 'add_photo' | 'validate' | 'auto_complete';
    payload?: any;
  };
  roomId?: string;
  elementId?: string;
  timestamp: Date;
}

interface UseMyAladinProactiveOptions {
  projectId: string;
  sessionId?: string;
  enabled?: boolean;
  onSuggestion?: (suggestion: ProactiveSuggestion) => void;
}

export const useMyAladinProactive = ({
  projectId,
  sessionId,
  enabled = true,
  onSuggestion
}: UseMyAladinProactiveOptions) => {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastActivityRef = useRef<Date>(new Date());
  const onSuggestionRef = useRef(onSuggestion);
  const hasNotifiedRef = useRef<Set<string>>(new Set());
  
  // Keep the ref updated
  useEffect(() => {
    onSuggestionRef.current = onSuggestion;
  }, [onSuggestion]);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track user activity
  const trackActivity = useCallback(() => {
    lastActivityRef.current = new Date();
  }, []);

  // Analyze current EDL state and generate suggestions
  const analyzeAndSuggest = useCallback(async () => {
    if (!enabled || !projectId) return;
    
    setIsAnalyzing(true);
    const newSuggestions: ProactiveSuggestion[] = [];

    try {
      // Fetch current EDL data
      const [
        { data: frames },
        { data: anomalies },
        { data: tasks },
        { data: locations },
        { data: zones }
      ] = await Promise.all([
        supabase.from('extracted_frames').select('*').eq('visit_session_id', sessionId || ''),
        supabase.from('detected_anomalies').select('*').eq('project_id', projectId),
        supabase.from('extracted_tasks').select('*').eq('project_id', projectId),
        supabase.from('property_locations').select('*').eq('project_id', projectId),
        supabase.from('location_zones').select('*').eq('project_id', projectId)
      ]);

      // Check for rooms without photos
      if (locations && frames) {
        const locationsWithPhotos = new Set(frames.map(f => f.location_id).filter(Boolean));
        const missingPhotoLocations = locations.filter(l => !locationsWithPhotos.has(l.id));
        
        missingPhotoLocations.slice(0, 3).forEach(loc => {
          newSuggestions.push({
            id: `missing_photo_${loc.id}`,
            type: 'missing_photo',
            message: `Il manque des photos pour "${loc.name || 'cette pièce'}"`,
            severity: 'warning',
            roomId: loc.id,
            action: {
              label: 'Ajouter photo',
              type: 'add_photo',
              payload: { locationId: loc.id }
            },
            timestamp: new Date()
          });
        });
      }

      // Check for unconfirmed anomalies
      if (anomalies) {
        const unconfirmed = anomalies.filter(a => !a.is_confirmed);
        if (unconfirmed.length > 0) {
          newSuggestions.push({
            id: `anomalies_unconfirmed_${Date.now()}`,
            type: 'validation_needed',
            message: `${unconfirmed.length} anomalie(s) détectée(s) en attente de validation`,
            severity: 'info',
            action: {
              label: 'Valider les anomalies',
              type: 'validate',
              payload: { anomalyIds: unconfirmed.map(a => a.id) }
            },
            timestamp: new Date()
          });
        }
      }

      // Check for anomalies without tasks
      if (anomalies && tasks) {
        const anomalyIds = new Set(anomalies.map(a => a.id));
        const tasksWithAnomalies = tasks.filter(t => t.frame_id);
        const anomaliesWithTasks = new Set(
          frames?.filter(f => tasksWithAnomalies.some(t => t.frame_id === f.id))
            .flatMap(f => anomalies.filter(a => a.frame_id === f.id).map(a => a.id)) || []
        );
        
        const anomaliesWithoutTasks = anomalies.filter(a => a.is_confirmed && !anomaliesWithTasks.has(a.id));
        
        if (anomaliesWithoutTasks.length > 0) {
          newSuggestions.push({
            id: `task_suggestion_${Date.now()}`,
            type: 'task_suggestion',
            message: `${anomaliesWithoutTasks.length} anomalie(s) confirmée(s) sans tâche associée`,
            severity: 'warning',
            action: {
              label: 'Créer les tâches',
              type: 'create_task',
              payload: { anomalyIds: anomaliesWithoutTasks.map(a => a.id) }
            },
            timestamp: new Date()
          });
        }
      }

      // Calculate room completion
      if (locations && zones && frames) {
        locations.forEach(loc => {
          const locZones = zones.filter(z => z.location_id === loc.id);
          const locFrames = frames.filter(f => f.location_id === loc.id);
          
          const zonesWithPhotos = new Set(locFrames.map(f => f.zone_id).filter(Boolean));
          const missingZones = locZones.filter(z => !zonesWithPhotos.has(z.id));
          
          if (missingZones.length > 0 && missingZones.length <= 2 && locZones.length > 2) {
            newSuggestions.push({
              id: `room_completion_${loc.id}`,
              type: 'room_completion',
              message: `Plus que ${missingZones.length} zone(s) à documenter dans "${loc.name || 'cette pièce'}"`,
              severity: 'info',
              roomId: loc.id,
              action: {
                label: 'Compléter',
                type: 'navigate',
                payload: { locationId: loc.id }
              },
              timestamp: new Date()
            });
          }
        });
      }

      setSuggestions(newSuggestions);
      
      // Notify for high priority suggestions - only once per suggestion ID
      newSuggestions
        .filter(s => s.severity === 'critical' || s.severity === 'warning')
        .filter(s => !hasNotifiedRef.current.has(s.id))
        .slice(0, 1)
        .forEach(s => {
          hasNotifiedRef.current.add(s.id);
          onSuggestionRef.current?.(s);
        });

    } catch (error) {
      console.error('Error analyzing EDL state:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectId, sessionId, enabled]);

  // Setup inactivity detection
  useEffect(() => {
    if (!enabled) return;

    const checkInactivity = () => {
      const now = new Date();
      const inactiveMs = now.getTime() - lastActivityRef.current.getTime();
      
      // After 30 seconds of inactivity, suggest help
      if (inactiveMs > 30000) {
        const inactivitySuggestion: ProactiveSuggestion = {
          id: `inactivity_${Date.now()}`,
          type: 'inactivity',
          message: 'Besoin d\'aide ? Je peux vous guider pour compléter l\'EDL.',
          severity: 'info',
          action: {
            label: 'Voir ce qui manque',
            type: 'navigate',
            payload: { view: 'missing_items' }
          },
          timestamp: new Date()
        };
        
        setSuggestions(prev => {
          if (!prev.some(s => s.type === 'inactivity')) {
            return [...prev, inactivitySuggestion];
          }
          return prev;
        });
      }
    };

    inactivityTimerRef.current = setInterval(checkInactivity, 10000);

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [enabled]);

  // Initial analysis and setup realtime subscriptions
  useEffect(() => {
    if (!enabled || !projectId) return;

    analyzeAndSuggest();

    // Subscribe to changes
    const channel = supabase
      .channel(`myaladin-proactive-${projectId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'extracted_frames',
        filter: `visit_session_id=eq.${sessionId}`
      }, () => analyzeAndSuggest())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'detected_anomalies',
        filter: `project_id=eq.${projectId}`
      }, () => analyzeAndSuggest())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, sessionId, enabled, analyzeAndSuggest]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const clearAllSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isAnalyzing,
    trackActivity,
    analyzeAndSuggest,
    dismissSuggestion,
    clearAllSuggestions
  };
};
