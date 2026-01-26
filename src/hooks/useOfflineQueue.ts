import { useState, useEffect, useCallback, useRef } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OfflineQueueItem {
  id: string;
  type: 'sequence' | 'task' | 'report';
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

interface MyDB extends DBSchema {
  offlineQueue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-timestamp': number; 'by-type': string; 'by-status': string };
  };
}

const DB_NAME = 'myedls-offline';
const DB_VERSION = 1;

/**
 * Hook pour gérer une queue offline avec IndexedDB
 * Permet de sauvegarder les données même en mode offline et de les synchroniser automatiquement
 */
export function useOfflineQueue() {
  const [db, setDb] = useState<IDBPDatabase<MyDB> | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Initialiser IndexedDB
  useEffect(() => {
    let mounted = true;

    const initDB = async () => {
      try {
        const database = await openDB<MyDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('offlineQueue')) {
              const store = db.createObjectStore('offlineQueue', { keyPath: 'id' });
              store.createIndex('by-timestamp', 'timestamp');
              store.createIndex('by-type', 'type');
              store.createIndex('by-status', 'status');
            }
          },
        });

        if (mounted) {
          setDb(database);
          await updateQueueSize(database);
        }
      } catch (error) {
        console.error('[useOfflineQueue] Error initializing DB:', error);
      }
    };

    initDB();

    // Écouter les changements de connexion
    const handleOnline = () => {
      setIsOnline(true);
      if (db && !isSyncingRef.current) {
        syncQueue(db);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Mettre à jour la taille de la queue
  const updateQueueSize = async (database: IDBPDatabase<MyDB>) => {
    try {
      const count = await database.count('offlineQueue', 'pending');
      setQueueSize(count);
    } catch (error) {
      console.error('[useOfflineQueue] Error updating queue size:', error);
    }
  };

  // Synchroniser un item individuel
  const syncItem = async (item: OfflineQueueItem, database: IDBPDatabase<MyDB>): Promise<boolean> => {
    try {
      // Marquer comme en cours de sync
      item.status = 'syncing';
      await database.put('offlineQueue', item);

      let success = false;

      switch (item.type) {
        case 'sequence':
          const { error: seqError } = await supabase
            .from('visit_sequences')
            .insert(item.data);
          if (!seqError) success = true;
          break;

        case 'task':
          const { error: taskError } = await supabase
            .from('extracted_tasks')
            .insert(item.data);
          if (!taskError) success = true;
          break;

        case 'report':
          const { error: reportError } = await supabase
            .from('edl_reports')
            .upsert(item.data, { onConflict: 'id' });
          if (!reportError) success = true;
          break;
      }

      if (success) {
        // Supprimer de la queue si succès
        await database.delete('offlineQueue', item.id);
        await updateQueueSize(database);
        return true;
      } else {
        // Incrémenter retries
        item.retries++;
        item.status = item.retries >= 5 ? 'failed' : 'pending';
        await database.put('offlineQueue', item);
        await updateQueueSize(database);
        return false;
      }
    } catch (error) {
      console.error('[useOfflineQueue] Error syncing item:', error);
      item.retries++;
      item.status = item.retries >= 5 ? 'failed' : 'pending';
      await database.put('offlineQueue', item);
      await updateQueueSize(database);
      return false;
    }
  };

  // Synchroniser toute la queue
  const syncQueue = useCallback(async (database: IDBPDatabase<MyDB>) => {
    if (isSyncingRef.current || !navigator.onLine) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      // Récupérer tous les items pending
      const items = await database.getAllFromIndex('offlineQueue', 'by-status', 'pending');
      
      if (items.length === 0) {
        isSyncingRef.current = false;
        setIsSyncing(false);
        return;
      }

      // Synchroniser chaque item
      for (const item of items) {
        if (!navigator.onLine) break; // Arrêter si déconnecté
        
        await syncItem(item, database);
        
        // Petit délai pour éviter de surcharger
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Vérifier s'il reste des items failed
      const failedItems = await database.getAllFromIndex('offlineQueue', 'by-status', 'failed');
      if (failedItems.length > 0) {
        toast.warning(`${failedItems.length} élément(s) n'ont pas pu être synchronisés après 5 tentatives`);
      }

      await updateQueueSize(database);
    } catch (error) {
      console.error('[useOfflineQueue] Error syncing queue:', error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Ajouter un item à la queue
  const addToQueue = useCallback(async (
    type: 'sequence' | 'task' | 'report',
    data: any
  ) => {
    if (!db) {
      console.warn('[useOfflineQueue] DB not initialized');
      return;
    }

    const item: OfflineQueueItem = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    try {
      await db.add('offlineQueue', item);
      await updateQueueSize(db);

      // Essayer de sync immédiatement si en ligne
      if (navigator.onLine && !isSyncingRef.current) {
        syncQueue(db);
      } else {
        toast.info('Données sauvegardées localement. Synchronisation automatique dès reconnexion.');
      }
    } catch (error) {
      console.error('[useOfflineQueue] Error adding to queue:', error);
      toast.error('Erreur lors de la sauvegarde locale');
    }
  }, [db, syncQueue]);

  // Démarrer la synchronisation automatique
  useEffect(() => {
    if (db && isOnline && !syncIntervalRef.current) {
      // Sync immédiat
      syncQueue(db);

      // Puis toutes les 10 secondes
      syncIntervalRef.current = setInterval(() => {
        if (navigator.onLine && !isSyncingRef.current) {
          syncQueue(db);
        }
      }, 10000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [db, isOnline, syncQueue]);

  // Forcer la synchronisation
  const forceSync = useCallback(async () => {
    if (db && navigator.onLine) {
      await syncQueue(db);
    } else {
      toast.error('Pas de connexion Internet');
    }
  }, [db, syncQueue]);

  // Récupérer les items failed
  const getFailedItems = useCallback(async () => {
    if (!db) return [];
    return await db.getAllFromIndex('offlineQueue', 'by-status', 'failed');
  }, [db]);

  // Réessayer les items failed
  const retryFailedItems = useCallback(async () => {
    if (!db) return;
    
    const failedItems = await getFailedItems();
    for (const item of failedItems) {
      item.status = 'pending';
      item.retries = 0;
      await db.put('offlineQueue', item);
    }
    
    await updateQueueSize(db);
    if (navigator.onLine) {
      syncQueue(db);
    }
  }, [db, getFailedItems, syncQueue]);

  return {
    addToQueue,
    isOnline,
    queueSize,
    isSyncing,
    forceSync,
    getFailedItems,
    retryFailedItems,
  };
}
