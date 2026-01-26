/**
 * Enhanced Offline Sync Hook for Reportage Hub
 * 
 * Manages complete offline workflow:
 * - Media uploads queue
 * - Metadata sync
 * - Network detection
 * - Auto-sync on reconnection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineQueue, SyncStatus } from '@/services/offlineQueue';
import { offlineMediaStore, OfflineMediaItem, MediaType } from '@/services/offlineMediaStore';
import { toast } from 'sonner';

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  pendingMediaCount: number;
  failedCount: number;
  lastSyncAt: Date | null;
  totalPendingSize: number;
}

export interface OfflineItemStatus {
  id: string;
  status: SyncStatus;
  progress?: number;
}

export const useOfflineSync = (projectId?: string) => {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    pendingMediaCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    totalPendingSize: 0,
  });

  const [itemStatuses, setItemStatuses] = useState<Map<string, SyncStatus>>(new Map());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Initialize stores
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        offlineQueue.initialize(),
        offlineMediaStore.initialize(),
      ]);
      await updateStats();
    };
    init();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast.success('Connexion rétablie', { 
        description: 'Synchronisation automatique en cours...',
        duration: 3000,
      });
      syncAll();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast.warning('Mode hors ligne actif', { 
        description: 'Vos données seront synchronisées automatiquement.',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic sync when online and has pending items
  useEffect(() => {
    if (state.isOnline && (state.pendingCount > 0 || state.pendingMediaCount > 0)) {
      syncIntervalRef.current = setInterval(() => {
        if (!isSyncingRef.current) {
          syncAll();
        }
      }, 30000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [state.isOnline, state.pendingCount, state.pendingMediaCount]);

  const updateStats = useCallback(async () => {
    try {
      const [queueStats, mediaStats] = await Promise.all([
        offlineQueue.getStats(),
        offlineMediaStore.getStats(),
      ]);

      setState(prev => ({
        ...prev,
        pendingCount: queueStats.pending,
        pendingMediaCount: mediaStats.pending + mediaStats.uploading,
        failedCount: queueStats.failed + mediaStats.failed,
        totalPendingSize: mediaStats.totalSize,
      }));

      // Update item statuses map
      const items = await offlineQueue.getAllItems();
      const newStatuses = new Map<string, SyncStatus>();
      items.forEach(item => {
        if (item.itemId) {
          newStatuses.set(item.itemId, item.status);
        }
      });
      setItemStatuses(newStatuses);
    } catch (error) {
      console.error('[OfflineSync] Failed to update stats:', error);
    }
  }, []);

  const getItemStatus = useCallback((itemId: string): SyncStatus => {
    return itemStatuses.get(itemId) || 'synced';
  }, [itemStatuses]);

  /**
   * Save media locally (offline-first)
   */
  const saveMediaOffline = useCallback(async (
    type: MediaType,
    file: Blob,
    options?: {
      sessionId?: string;
      locationId?: string;
      zoneId?: string;
      fileName?: string;
      metadata?: Record<string, any>;
      thumbnail?: Blob;
    }
  ): Promise<{ id: string; synced: boolean }> => {
    if (!projectId) {
      throw new Error('Project ID required');
    }

    const id = await offlineMediaStore.saveMedia(projectId, type, file, options);

    // If online, try to sync immediately
    if (navigator.onLine) {
      const synced = await syncMediaItem(id);
      return { id, synced };
    }

    await updateStats();
    return { id, synced: false };
  }, [projectId, updateStats]);

  /**
   * Sync a single media item to Supabase Storage
   */
  const syncMediaItem = async (id: string): Promise<boolean> => {
    try {
      const item = await offlineMediaStore.getMedia(id);
      if (!item) return false;

      await offlineMediaStore.updateStatus(id, 'uploading');

      // Determine bucket based on type
      const bucket = item.type === 'photo' ? 'visit-frames' 
        : item.type === 'video' ? 'visit-videos'
        : item.type === 'audio' ? 'visit-audio'
        : 'zone-media';

      const filePath = `${item.projectId}/${item.sessionId || 'misc'}/${item.fileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, item.blob, {
          contentType: item.mimeType,
          upsert: true,
        });

      if (error) {
        await offlineMediaStore.updateStatus(id, 'failed', { error: error.message });
        console.error('[OfflineSync] Media upload failed:', error);
        return false;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

      await offlineMediaStore.updateStatus(id, 'synced', { uploadedUrl: urlData.publicUrl });

      // Create database record if needed
      if (item.type === 'photo' && item.sessionId) {
        await supabase.from('extracted_frames').insert({
          visit_session_id: item.sessionId,
          frame_url: urlData.publicUrl,
          timestamp_seconds: item.metadata.timestamp || 0,
          location_id: item.locationId,
          zone_id: item.zoneId,
          edl_tags: item.metadata.edlTags,
        });
      }

      console.log('[OfflineSync] Media synced:', id);
      return true;
    } catch (error) {
      await offlineMediaStore.updateStatus(id, 'failed', { error: (error as Error).message });
      return false;
    }
  };

  /**
   * Sync all pending items
   */
  const syncAll = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (isSyncingRef.current || !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    isSyncingRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true }));

    let synced = 0;
    let failed = 0;

    try {
      // Sync media first
      const pendingMedia = await offlineMediaStore.getPendingMedia();
      for (const item of pendingMedia) {
        if (item.retryCount >= 3) {
          failed++;
          continue;
        }
        const success = await syncMediaItem(item.id);
        if (success) {
          synced++;
        } else {
          failed++;
        }
      }

      // Sync queue items
      const pendingItems = await offlineQueue.getPendingItems();
      for (const item of pendingItems) {
        if (item.retryCount >= 3) {
          failed++;
          continue;
        }

        try {
          await offlineQueue.updateStatus(item.id, 'syncing');

          let error = null;
          if (item.operation === 'create') {
            const { error: insertError } = await supabase
              .from(item.table as any)
              .insert(item.data);
            error = insertError;
          } else if (item.operation === 'update') {
            const { id: itemId, ...updateData } = item.data;
            const { error: updateError } = await supabase
              .from(item.table as any)
              .update(updateData)
              .eq('id', itemId);
            error = updateError;
          } else if (item.operation === 'delete') {
            const { error: deleteError } = await supabase
              .from(item.table as any)
              .delete()
              .eq('id', item.data.id);
            error = deleteError;
          }

          if (error) {
            await offlineQueue.updateStatus(item.id, 'failed', error.message);
            failed++;
          } else {
            await offlineQueue.removeFromQueue(item.id);
            synced++;
          }
        } catch (err) {
          await offlineQueue.updateStatus(item.id, 'failed', (err as Error).message);
          failed++;
        }
      }

      if (synced > 0) {
        toast.success(`${synced} élément${synced > 1 ? 's' : ''} synchronisé${synced > 1 ? 's' : ''}`);
      }

      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
      }));

      await updateStats();
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
    } finally {
      isSyncingRef.current = false;
    }

    return { synced, failed };
  }, [updateStats]);

  /**
   * Force sync now
   */
  const forceSync = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error('Pas de connexion');
      return;
    }
    return syncAll();
  }, [syncAll]);

  /**
   * Queue a metadata operation
   */
  const queueOperation = useCallback(async (
    type: 'sequence' | 'note' | 'location' | 'task' | 'metadata',
    operation: 'create' | 'update' | 'delete',
    table: string,
    data: Record<string, any>,
    itemId?: string
  ): Promise<{ queued: boolean; synced: boolean }> => {
    try {
      const queueId = await offlineQueue.addToQueue({
        type,
        operation,
        table,
        data,
        projectId,
        itemId,
      });

      if (navigator.onLine) {
        // Try immediate sync
        try {
          let error = null;
          if (operation === 'create') {
            const { error: insertError } = await supabase.from(table as any).insert(data);
            error = insertError;
          } else if (operation === 'update') {
            const { id, ...updateData } = data;
            const { error: updateError } = await supabase.from(table as any).update(updateData).eq('id', id);
            error = updateError;
          }

          if (!error) {
            await offlineQueue.removeFromQueue(queueId);
            await updateStats();
            return { queued: false, synced: true };
          }
        } catch {
          // Fall through to queued
        }
      }

      await updateStats();
      return { queued: true, synced: false };
    } catch (error) {
      console.error('[OfflineSync] Queue operation failed:', error);
      return { queued: false, synced: false };
    }
  }, [projectId, updateStats]);

  /**
   * Get local URL for offline media
   */
  const getLocalMediaUrl = useCallback(async (id: string): Promise<string | null> => {
    const item = await offlineMediaStore.getMedia(id);
    if (!item) return null;
    return URL.createObjectURL(item.blob);
  }, []);

  return {
    ...state,
    getItemStatus,
    saveMediaOffline,
    queueOperation,
    syncAll,
    forceSync,
    updateStats,
    getLocalMediaUrl,
  };
};
