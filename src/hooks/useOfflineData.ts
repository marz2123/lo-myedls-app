import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB, OfflineRecord, OfflinePhoto } from '@/lib/offlineDatabase';
import { useNetworkStatus } from './useNetworkStatus';

interface UseOfflineDataOptions {
  projectId: string;
  sessionId?: string;
}

export const useOfflineData = ({ projectId, sessionId }: UseOfflineDataOptions) => {
  const { isOnline, isOffline } = useNetworkStatus();
  const [initialized, setInitialized] = useState(false);

  // Initialize IndexedDB
  useEffect(() => {
    offlineDB.init().then(() => setInitialized(true));
  }, []);

  // Save room data
  const saveRoom = useCallback(async (roomData: any) => {
    const record: OfflineRecord = {
      id: roomData.id || crypto.randomUUID(),
      data: { ...roomData, project_id: projectId },
      table: 'rooms',
      pendingSync: true,
      syncAction: roomData.id ? 'update' : 'insert',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conflictStrategy: 'local_first',
    };

    await offlineDB.put('rooms', record);

    // If online, also save to Supabase
    if (isOnline) {
      try {
        if (record.syncAction === 'insert') {
          await supabase.from('property_locations').insert(record.data);
        } else {
          await supabase.from('property_locations').update(record.data).eq('id', record.id);
        }
        await offlineDB.clearPendingSync('rooms', record.id);
      } catch (error) {
        console.error('Error saving room online:', error);
      }
    }

    return record.id;
  }, [projectId, isOnline]);

  // Save item/element data
  const saveItem = useCallback(async (itemData: any) => {
    const record: OfflineRecord = {
      id: itemData.id || crypto.randomUUID(),
      data: { ...itemData, project_id: projectId },
      table: 'items',
      pendingSync: true,
      syncAction: itemData.id ? 'update' : 'insert',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conflictStrategy: 'local_first',
    };

    await offlineDB.put('items', record);

    if (isOnline) {
      try {
        if (record.syncAction === 'insert') {
          await supabase.from('location_zones').insert(record.data);
        } else {
          await supabase.from('location_zones').update(record.data).eq('id', record.id);
        }
        await offlineDB.clearPendingSync('items', record.id);
      } catch (error) {
        console.error('Error saving item online:', error);
      }
    }

    return record.id;
  }, [projectId, isOnline]);

  // Save photo with offline support
  const savePhoto = useCallback(async (
    photoData: { uri: string; blob?: Blob },
    metadata: { roomName?: string; elementName?: string }
  ) => {
    const photoId = crypto.randomUUID();
    const offlinePhoto: OfflinePhoto = {
      id: photoId,
      localUri: photoData.uri,
      blob: photoData.blob,
      projectId,
      sessionId,
      roomName: metadata.roomName,
      elementName: metadata.elementName,
      pendingSync: true,
      createdAt: new Date().toISOString(),
      metadata,
    };

    await offlineDB.savePhoto(offlinePhoto);

    // If online, upload immediately
    if (isOnline && photoData.blob) {
      try {
        const fileName = `${projectId}/${photoId}.jpg`;
        const { error } = await supabase.storage
          .from('visit-frames')
          .upload(fileName, photoData.blob, { contentType: 'image/jpeg' });

        if (!error) {
          const { data: publicUrl } = supabase.storage
            .from('visit-frames')
            .getPublicUrl(fileName);

          await offlineDB.savePhoto({
            ...offlinePhoto,
            localUri: publicUrl.publicUrl,
            pendingSync: false,
            blob: undefined,
          });

          return { id: photoId, url: publicUrl.publicUrl, offline: false };
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }

    return { id: photoId, url: photoData.uri, offline: true };
  }, [projectId, sessionId, isOnline]);

  // Save anomaly
  const saveAnomaly = useCallback(async (anomalyData: any) => {
    const record: OfflineRecord = {
      id: anomalyData.id || crypto.randomUUID(),
      data: { ...anomalyData, project_id: projectId },
      table: 'anomalies',
      pendingSync: true,
      syncAction: anomalyData.id ? 'update' : 'insert',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conflictStrategy: 'local_first',
    };

    await offlineDB.put('anomalies', record);

    if (isOnline) {
      try {
        if (record.syncAction === 'insert') {
          await supabase.from('detected_anomalies').insert(record.data);
        } else {
          await supabase.from('detected_anomalies').update(record.data).eq('id', record.id);
        }
        await offlineDB.clearPendingSync('anomalies', record.id);
      } catch (error) {
        console.error('Error saving anomaly online:', error);
      }
    }

    return record.id;
  }, [projectId, isOnline]);

  // Save task
  const saveTask = useCallback(async (taskData: any) => {
    const record: OfflineRecord = {
      id: taskData.id || crypto.randomUUID(),
      data: { ...taskData, project_id: projectId },
      table: 'tasks',
      pendingSync: true,
      syncAction: taskData.id ? 'update' : 'insert',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conflictStrategy: 'local_first',
    };

    await offlineDB.put('tasks', record);

    if (isOnline) {
      try {
        if (record.syncAction === 'insert') {
          await supabase.from('problem_tasks').insert(record.data);
        } else {
          await supabase.from('problem_tasks').update(record.data).eq('id', record.id);
        }
        await offlineDB.clearPendingSync('tasks', record.id);
      } catch (error) {
        console.error('Error saving task online:', error);
      }
    }

    return record.id;
  }, [projectId, isOnline]);

  // Save timeline event
  const saveEvent = useCallback(async (eventData: any) => {
    const record: OfflineRecord = {
      id: eventData.id || crypto.randomUUID(),
      data: { ...eventData, project_id: projectId },
      table: 'events',
      pendingSync: true,
      syncAction: 'insert',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conflictStrategy: 'timestamp',
    };

    await offlineDB.put('events', record);

    if (isOnline) {
      try {
        await supabase.from('edl_events').insert(record.data);
        await offlineDB.clearPendingSync('events', record.id);
      } catch (error) {
        console.error('Error saving event online:', error);
      }
    }

    return record.id;
  }, [projectId, isOnline]);

  // Get all offline photos for this project
  const getOfflinePhotos = useCallback(async () => {
    return offlineDB.getOfflinePhotos(projectId);
  }, [projectId]);

  // Get pending sync count
  const getPendingSyncCount = useCallback(async () => {
    const stores = ['rooms', 'items', 'photos', 'anomalies', 'tasks', 'events'];
    let count = 0;
    
    for (const store of stores) {
      if (store === 'photos') {
        count += (await offlineDB.getPendingPhotos()).length;
      } else {
        count += (await offlineDB.getPendingSync(store)).length;
      }
    }
    
    return count;
  }, []);

  return {
    initialized,
    isOnline,
    isOffline,
    saveRoom,
    saveItem,
    savePhoto,
    saveAnomaly,
    saveTask,
    saveEvent,
    getOfflinePhotos,
    getPendingSyncCount,
  };
};
