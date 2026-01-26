import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoSaveData {
  description?: string;
  photos?: string[];
  videoUrl?: string;
  zoneType?: string;
  locationId?: string;
  endroitName?: string;
}

interface UseAutoSaveOptions {
  projectId: string;
  sequenceId?: string | null;
  enabled?: boolean;
  intervalMs?: number;
  onSave?: () => void;
  onError?: (error: Error) => void;
}

export const useAutoSave = (
  data: AutoSaveData,
  options: UseAutoSaveOptions
) => {
  const {
    projectId,
    sequenceId,
    enabled = true,
    intervalMs = 3000,
    onSave,
    onError,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const lastDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const draftKeyRef = useRef<string>(`myedls_draft_${projectId}`);

  // Serialize data for comparison
  const serializeData = useCallback((d: AutoSaveData) => {
    return JSON.stringify(d);
  }, []);

  // Check if data has changed
  const hasDataChanged = useCallback((newData: AutoSaveData) => {
    const serialized = serializeData(newData);
    return serialized !== lastDataRef.current;
  }, [serializeData]);

  // Save to localStorage (immediate)
  const saveDraft = useCallback((d: AutoSaveData) => {
    try {
      localStorage.setItem(draftKeyRef.current, JSON.stringify({
        ...d,
        savedAt: new Date().toISOString(),
      }));
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  }, []);

  // Load draft from localStorage
  const loadDraft = useCallback((): AutoSaveData | null => {
    try {
      const saved = localStorage.getItem(draftKeyRef.current);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
    return null;
  }, []);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKeyRef.current);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  }, []);

  // Save to Supabase (if sequenceId exists)
  const saveToDatabase = useCallback(async (d: AutoSaveData) => {
    if (!sequenceId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('visit_sequences')
        .update({
          description: d.description,
          zone_type: d.zoneType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sequenceId);

      if (error) throw error;

      setLastSaved(new Date());
      onSave?.();
    } catch (err) {
      console.error('Auto-save failed:', err);
      onError?.(err instanceof Error ? err : new Error('Save failed'));
    } finally {
      setIsSaving(false);
    }
  }, [sequenceId, onSave, onError]);

  // Auto-save effect
  useEffect(() => {
    if (!enabled) return;

    // Check if data changed
    if (hasDataChanged(data)) {
      lastDataRef.current = serializeData(data);
      setHasUnsavedChanges(true);

      // Immediate local save
      saveDraft(data);

      // Debounced database save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase(data);
      }, intervalMs);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, enabled, hasDataChanged, serializeData, saveDraft, saveToDatabase, intervalMs]);

  // Force save
  const forceSave = useCallback(async () => {
    saveDraft(data);
    await saveToDatabase(data);
  }, [data, saveDraft, saveToDatabase]);

  // Cleanup on unmount - save any unsaved changes
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        saveDraft(data);
      }
    };
  }, [hasUnsavedChanges, data, saveDraft]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    forceSave,
    loadDraft,
    clearDraft,
  };
};
