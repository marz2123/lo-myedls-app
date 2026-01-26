import { useState, useEffect, useCallback } from 'react';
import { Network } from '@capacitor/network';
import { offlineDatabase } from '@/services/offlineDatabase';
import { syncService } from '@/services/syncService';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

interface OfflineStats {
  pendingVisits: number;
  pendingBlocks: number;
  pendingFrames: number;
  syncQueueSize: number;
}

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export const useOfflineMode = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineStats, setOfflineStats] = useState<OfflineStats>({
    pendingVisits: 0,
    pendingBlocks: 0,
    pendingFrames: 0,
    syncQueueSize: 0
  });
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  // Initialize offline database
  useEffect(() => {
    const init = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('[Offline Mode] Not on native platform');
        return;
      }

      try {
        const initialized = await offlineDatabase.initialize();
        setIsOfflineReady(initialized);

        if (initialized) {
          await updateOfflineStats();
          toast.success('Mode offline activé', {
            description: 'Vos visites seront sauvegardées localement'
          });
        }
      } catch (error) {
        console.error('[Offline Mode] Initialization failed:', error);
        toast.error('Erreur mode offline');
      }
    };

    init();
  }, []);

  // Monitor network status
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initNetworkMonitor = async () => {
      // Get initial status
      const status = await Network.getStatus();
      setIsOnline(status.connected);

      // Listen for changes
      Network.addListener('networkStatusChange', (status) => {
        const wasOnline = isOnline;
        setIsOnline(status.connected);

        if (!wasOnline && status.connected) {
          // Just came back online
          toast.success('Connexion rétablie', {
            description: 'Synchronisation automatique...'
          });
          handleAutoSync();
        } else if (wasOnline && !status.connected) {
          // Just went offline
          toast.warning('Mode offline', {
            description: 'Vos données seront synchronisées plus tard'
          });
        }
      });
    };

    initNetworkMonitor();

    return () => {
      Network.removeAllListeners();
    };
  }, [isOnline]);

  const updateOfflineStats = useCallback(async () => {
    try {
      const stats = await offlineDatabase.getOfflineStats();
      setOfflineStats(stats);
    } catch (error) {
      console.error('[Offline Mode] Failed to get stats:', error);
    }
  }, []);

  const handleAutoSync = useCallback(async () => {
    if (isSyncing || !isOnline || !isOfflineReady) return;

    const stats = await offlineDatabase.getOfflineStats();
    const hasPendingData = 
      stats.pendingVisits > 0 || 
      stats.pendingBlocks > 0 || 
      stats.pendingFrames > 0;

    if (!hasPendingData) return;

    setIsSyncing(true);

    try {
      const success = await syncService.startSync((progress) => {
        setSyncProgress(progress);
      });

      if (success) {
        toast.success('Synchronisation réussie', {
          description: `${syncProgress?.completed || 0} éléments synchronisés`
        });
        await updateOfflineStats();
      } else {
        toast.error('Synchronisation partielle', {
          description: `${syncProgress?.failed || 0} éléments en échec`
        });
      }
    } catch (error) {
      console.error('[Offline Mode] Sync failed:', error);
      toast.error('Erreur de synchronisation');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [isOnline, isSyncing, isOfflineReady, syncProgress]);

  const manualSync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Pas de connexion', {
        description: 'La synchronisation nécessite une connexion'
      });
      return;
    }

    await handleAutoSync();
  }, [isOnline, handleAutoSync]);

  return {
    isOnline,
    isOfflineReady,
    isSyncing,
    offlineStats,
    syncProgress,
    updateOfflineStats,
    manualSync
  };
};
