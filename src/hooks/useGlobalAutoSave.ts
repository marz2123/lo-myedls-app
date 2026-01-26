// Global Auto-Save Hook
// Provides auto-save functionality across all capture flows
// with crash recovery and offline queuing

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventLogger } from '@/services/eventLogger';
import { useToast } from '@/hooks/use-toast';

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  pendingChanges: number;
}

interface CaptureData {
  projectId: string;
  edlType?: string;
  captureMode?: string;
  currentPiece?: string;
  currentZone?: string;
  mediaUrls?: string[];
  transcript?: string;
  observations?: string[];
  zonesChecked?: Record<string, boolean>;
  startedAt?: string;
}

const AUTOSAVE_KEY = 'myedls_autosave_capture';
const AUTOSAVE_INTERVAL = 3000; // 3 seconds

export const useGlobalAutoSave = (projectId?: string) => {
  const { toast } = useToast();
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    pendingChanges: 0,
  });

  const dataRef = useRef<CaptureData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveHashRef = useRef<string>('');

  // Generate hash to detect changes
  const getDataHash = useCallback((data: CaptureData): string => {
    return JSON.stringify(data);
  }, []);

  // Save to localStorage (offline-first)
  const saveToLocal = useCallback((data: CaptureData) => {
    try {
      const saveData = {
        ...data,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Local save failed:', error);
      return false;
    }
  }, []);

  // Save to Supabase (when online)
  const saveToRemote = useCallback(async (data: CaptureData): Promise<boolean> => {
    if (!data.projectId) return false;

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      // Save as draft visit session
      const { error } = await supabase
        .from('visit_sessions')
        .insert({
          project_id: data.projectId,
          user_id: userData.user.id,
          status: 'draft',
          metadata: {
            edlType: data.edlType,
            captureMode: data.captureMode,
            currentPiece: data.currentPiece,
            currentZone: data.currentZone,
            zonesChecked: data.zonesChecked,
            observations: data.observations,
            startedAt: data.startedAt,
            lastSaved: new Date().toISOString(),
          },
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Remote save failed:', error);
      return false;
    }
  }, []);

  // Main auto-save function
  const performAutoSave = useCallback(async () => {
    const data = dataRef.current;
    if (!data) return;

    const currentHash = getDataHash(data);
    if (currentHash === lastSaveHashRef.current) {
      // No changes
      setState(prev => ({ ...prev, hasUnsavedChanges: false }));
      return;
    }

    setState(prev => ({ ...prev, isSaving: true }));

    // Always save locally first (offline-first)
    const localSaved = saveToLocal(data);

    // Try remote save if online
    let remoteSaved = false;
    if (navigator.onLine) {
      remoteSaved = await saveToRemote(data);
    }

    if (localSaved || remoteSaved) {
      lastSaveHashRef.current = currentHash;
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        pendingChanges: remoteSaved ? 0 : prev.pendingChanges + 1,
      }));
    } else {
      setState(prev => ({
        ...prev,
        isSaving: false,
        hasUnsavedChanges: true,
      }));
    }
  }, [getDataHash, saveToLocal, saveToRemote]);

  // Update data to save
  const updateData = useCallback((data: Partial<CaptureData>) => {
    dataRef.current = {
      ...dataRef.current,
      ...data,
      projectId: data.projectId || dataRef.current?.projectId || projectId || '',
    } as CaptureData;
    
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));
  }, [projectId]);

  // Force immediate save
  const forceSave = useCallback(async () => {
    await performAutoSave();
  }, [performAutoSave]);

  // Load saved data (for crash recovery)
  const loadSavedData = useCallback((): CaptureData | null => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return null;
      
      const data = JSON.parse(saved);
      
      // Check if this is for the current project
      if (projectId && data.projectId !== projectId) {
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  }, [projectId]);

  // Check for unsaved data on mount
  const checkForRecovery = useCallback((): { 
    hasRecoverableData: boolean; 
    data: CaptureData | null;
    savedAt: string | null;
  } => {
    const saved = loadSavedData();
    if (!saved) {
      return { hasRecoverableData: false, data: null, savedAt: null };
    }
    
    const savedAt = (saved as any).savedAt;
    return { 
      hasRecoverableData: true, 
      data: saved, 
      savedAt 
    };
  }, [loadSavedData]);

  // Clear saved data (after successful completion)
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    dataRef.current = null;
    lastSaveHashRef.current = '';
    setState({
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      pendingChanges: 0,
    });
  }, []);

  // Resume from saved data
  const resumeFromSaved = useCallback((data: CaptureData) => {
    dataRef.current = data;
    lastSaveHashRef.current = getDataHash(data);
    setState(prev => ({ ...prev, hasUnsavedChanges: false }));
    
    eventLogger.log({
      category: 'capture',
      action: 'session_resumed',
      projectId: data.projectId,
    });
    
    toast({
      title: "Reportage repris",
      description: "Ton reportage précédent a été restauré.",
    });
    
    return data;
  }, [getDataHash, toast]);

  // Start auto-save interval
  useEffect(() => {
    intervalRef.current = setInterval(performAutoSave, AUTOSAVE_INTERVAL);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [performAutoSave]);

  // Save on visibility change (user leaving page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && state.hasUnsavedChanges) {
        performAutoSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [performAutoSave, state.hasUnsavedChanges]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        saveToLocal(dataRef.current!);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveToLocal, state.hasUnsavedChanges]);

  return {
    ...state,
    updateData,
    forceSave,
    checkForRecovery,
    resumeFromSaved,
    clearSavedData,
  };
};

export default useGlobalAutoSave;
