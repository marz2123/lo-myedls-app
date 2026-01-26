import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB, OfflineRecord, OfflinePhoto, SyncQueueItem } from '@/lib/offlineDatabase';
import { useNetworkStatus } from './useNetworkStatus';
import { toast } from 'sonner';

interface SyncProgress {
  total: number;
  completed: number;
  current: string;
  phase: 'idle' | 'photos' | 'data' | 'events' | 'complete';
}

interface ConflictItem {
  id: string;
  table: string;
  localData: any;
  serverData: any;
  field: string;
}

const TABLE_MAPPING: Record<string, string> = {
  rooms: 'property_locations',
  items: 'location_zones',
  photos: 'extracted_frames',
  anomalies: 'detected_anomalies',
  tasks: 'problem_tasks',
  events: 'edl_events',
};

const SYNC_PRIORITY: Record<string, number> = {
  photos: 1,
  rooms: 2,
  items: 3,
  anomalies: 4,
  tasks: 5,
  events: 6,
  aladin_logs: 7,
};

export const useSyncEngine = (projectId?: string) => {
  const { isOnline, setSyncing, subscribe } = useNetworkStatus();
  const [progress, setProgress] = useState<SyncProgress>({
    total: 0,
    completed: 0,
    current: '',
    phase: 'idle',
  });
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLockRef = useRef(false);
  const pendingResumeRef = useRef(false);

  // Upload photo to Supabase Storage
  const uploadPhoto = useCallback(async (photo: OfflinePhoto): Promise<string | null> => {
    try {
      if (!photo.blob && photo.localUri.startsWith('data:')) {
        // Convert base64 to blob
        const response = await fetch(photo.localUri);
        photo.blob = await response.blob();
      }

      if (!photo.blob) {
        console.error('No blob available for photo:', photo.id);
        return null;
      }

      const fileName = `${photo.projectId}/${photo.id}.jpg`;
      const { data, error } = await supabase.storage
        .from('visit-frames')
        .upload(fileName, photo.blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('visit-frames')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }, []);

  // Sync photos first
  const syncPhotos = useCallback(async (): Promise<number> => {
    const pendingPhotos = await offlineDB.getPendingPhotos();
    let synced = 0;

    for (const photo of pendingPhotos) {
      setProgress(p => ({ ...p, current: `Photo ${synced + 1}/${pendingPhotos.length}` }));
      
      const cloudUrl = await uploadPhoto(photo);
      if (cloudUrl) {
        // Update local record with cloud URL
        await offlineDB.savePhoto({
          ...photo,
          localUri: cloudUrl,
          pendingSync: false,
          blob: undefined,
        });
        synced++;
      }
      
      setProgress(p => ({ ...p, completed: p.completed + 1 }));
    }

    return synced;
  }, [uploadPhoto]);

  // Sync data records
  const syncDataRecords = useCallback(async (storeName: string): Promise<number> => {
    const supabaseTable = TABLE_MAPPING[storeName];
    if (!supabaseTable) return 0;

    const pendingRecords = await offlineDB.getPendingSync(storeName);
    let synced = 0;

    for (const record of pendingRecords) {
      setProgress(p => ({ ...p, current: `${storeName}: ${synced + 1}/${pendingRecords.length}` }));

      try {
        // Use generic approach for dynamic tables
        const { data: existingData, error: fetchError } = await supabase
          .from(supabaseTable as any)
          .select('*')
          .eq('id', record.id)
          .single();

        if (record.syncAction === 'delete') {
          await supabase.from(supabaseTable as any).delete().eq('id', record.id);
        } else if (existingData && !fetchError) {
          // Check for conflicts using timestamps
          const serverTime = (existingData as any).updated_at || (existingData as any).created_at;
          if (record.conflictStrategy === 'local_first' || 
              (serverTime && new Date(record.updatedAt) > new Date(serverTime))) {
            await supabase.from(supabaseTable as any).update(record.data).eq('id', record.id);
          }
        } else {
          await supabase.from(supabaseTable as any).insert(record.data);
        }

        await offlineDB.clearPendingSync(storeName, record.id);
        synced++;
      } catch (error) {
        console.error(`Error syncing ${storeName} record:`, error);
      }

      setProgress(p => ({ ...p, completed: p.completed + 1 }));
    }

    return synced;
  }, []);

  // Main sync function
  const sync = useCallback(async () => {
    if (syncLockRef.current || !isOnline) {
      if (!isOnline) pendingResumeRef.current = true;
      return;
    }

    syncLockRef.current = true;
    setIsSyncing(true);
    setSyncing(true);

    try {
      // Calculate total items
      const stores = ['photos', 'rooms', 'items', 'anomalies', 'tasks', 'events'];
      let totalItems = 0;
      
      for (const store of stores) {
        if (store === 'photos') {
          totalItems += (await offlineDB.getPendingPhotos()).length;
        } else {
          totalItems += (await offlineDB.getPendingSync(store)).length;
        }
      }

      if (totalItems === 0) {
        setProgress({ total: 0, completed: 0, current: '', phase: 'complete' });
        return;
      }

      setProgress({ total: totalItems, completed: 0, current: '', phase: 'photos' });

      // Phase 1: Sync photos
      await syncPhotos();
      setProgress(p => ({ ...p, phase: 'data' }));

      // Phase 2: Sync data in priority order
      const orderedStores = Object.entries(SYNC_PRIORITY)
        .sort((a, b) => a[1] - b[1])
        .map(([store]) => store)
        .filter(store => store !== 'photos');

      for (const store of orderedStores) {
        await syncDataRecords(store);
      }

      // Phase 3: Complete
      setProgress(p => ({ ...p, phase: 'complete' }));
      toast.success('Synchronisation terminée ✓');

      // Refresh data after sync
      setTimeout(() => {
        setProgress({ total: 0, completed: 0, current: '', phase: 'idle' });
      }, 2000);

    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erreur de synchronisation');
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
      setSyncing(false);
    }
  }, [isOnline, setSyncing, syncPhotos, syncDataRecords]);

  // Auto-sync when coming back online
  useEffect(() => {
    const unsubscribe = subscribe((status) => {
      if (status === 'online' && pendingResumeRef.current) {
        pendingResumeRef.current = false;
        sync();
      }
    });

    return unsubscribe;
  }, [subscribe, sync]);

  // Initial sync check on mount
  useEffect(() => {
    if (isOnline) {
      // Check if there's pending data
      const checkPending = async () => {
        const photos = await offlineDB.getPendingPhotos();
        if (photos.length > 0) {
          sync();
        }
      };
      checkPending();
    }
  }, [isOnline, sync]);

  // Resolve conflict
  const resolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'local' | 'server' | 'merge'
  ) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    // Apply resolution logic here
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  }, [conflicts]);

  return {
    sync,
    progress,
    isSyncing,
    conflicts,
    resolveConflict,
    isOnline,
  };
};
