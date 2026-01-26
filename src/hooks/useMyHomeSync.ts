import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SyncStatus, Edl, Site } from './useMultiSites';

export interface SyncResult {
  success: boolean;
  sync_type: string;
  items_synced: number;
  error?: string;
}

export interface MyHomeSyncOptions {
  dpgf: boolean;
  planning: boolean;
  tasks: boolean;
  documents: boolean;
  notice: boolean;
}

export function useMyHomeSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: string;
    progress: number;
    total: number;
  } | null>(null);
  const [lastSyncResults, setLastSyncResults] = useState<SyncResult[]>([]);
  const { toast } = useToast();

  const createSyncLog = useCallback(async (
    edlId: string | null,
    siteId: string | null,
    syncType: string,
    status: SyncStatus
  ) => {
    const { data, error } = await supabase
      .from('sync_logs')
      .insert({
        edl_id: edlId,
        site_id: siteId,
        sync_type: syncType,
        status,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating sync log:', error);
      return null;
    }
    return data;
  }, []);

  const updateSyncLog = useCallback(async (
    logId: string,
    status: SyncStatus,
    itemsSynced: number,
    errorMessage?: string
  ) => {
    await supabase
      .from('sync_logs')
      .update({
        status,
        items_synced: itemsSynced,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);
  }, []);

  const syncEdlToMyHome = useCallback(async (
    edl: Edl,
    site: Site,
    options: MyHomeSyncOptions
  ): Promise<SyncResult[]> => {
    setIsSyncing(true);
    const results: SyncResult[] = [];
    const syncTypes = Object.entries(options)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type);

    let completed = 0;

    try {
      // Update EDL sync state
      await supabase
        .from('edls')
        .update({ sync_state: 'syncing' as SyncStatus })
        .eq('id', edl.id);

      for (const syncType of syncTypes) {
        setSyncProgress({
          current: getSyncTypeLabel(syncType),
          progress: completed,
          total: syncTypes.length,
        });

        const log = await createSyncLog(edl.id, site.id, syncType, 'syncing');

        try {
          // Simulate sync to MyHome API (in production, this would call actual MyHome endpoints)
          const result = await performSync(edl, site, syncType);
          
          if (log) {
            await updateSyncLog(log.id, 'synced', result.items_synced);
          }

          results.push({
            success: true,
            sync_type: syncType,
            items_synced: result.items_synced,
          });
        } catch (error: any) {
          if (log) {
            await updateSyncLog(log.id, 'failed', 0, error.message);
          }
          results.push({
            success: false,
            sync_type: syncType,
            items_synced: 0,
            error: error.message,
          });
        }

        completed++;
      }

      // Update EDL sync state and last synced time
      const allSuccess = results.every(r => r.success);
      await supabase
        .from('edls')
        .update({ 
          sync_state: allSuccess ? 'synced' : 'failed' as SyncStatus 
        })
        .eq('id', edl.id);

      await supabase
        .from('sites')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', site.id);

      setLastSyncResults(results);

      const successCount = results.filter(r => r.success).length;
      toast({
        title: allSuccess ? 'Synchronisation terminée' : 'Synchronisation partielle',
        description: `${successCount}/${results.length} éléments synchronisés avec MyHome.`,
        variant: allSuccess ? 'default' : 'destructive',
      });

      return results;
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Erreur de synchronisation',
        description: error.message || 'Impossible de synchroniser avec MyHome',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [createSyncLog, updateSyncLog, toast]);

  const getSyncLogs = useCallback(async (edlId?: string, siteId?: string) => {
    let query = supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (edlId) query = query.eq('edl_id', edlId);
    if (siteId) query = query.eq('site_id', siteId);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching sync logs:', error);
      return [];
    }
    return data;
  }, []);

  return {
    isSyncing,
    syncProgress,
    lastSyncResults,
    syncEdlToMyHome,
    getSyncLogs,
  };
}

// Helper functions
function getSyncTypeLabel(syncType: string): string {
  const labels: Record<string, string> = {
    dpgf: 'DPGF',
    planning: 'Planning',
    tasks: 'Tâches',
    documents: 'Documents',
    notice: 'Notice Descriptive',
  };
  return labels[syncType] || syncType;
}

async function performSync(
  edl: Edl,
  site: Site,
  syncType: string
): Promise<{ items_synced: number }> {
  // In production, this would call actual MyHome API endpoints
  // For now, we simulate the sync process
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // Simulate different sync operations
  switch (syncType) {
    case 'dpgf':
      return { items_synced: Math.floor(Math.random() * 50) + 10 };
    case 'planning':
      return { items_synced: Math.floor(Math.random() * 20) + 5 };
    case 'tasks':
      return { items_synced: edl.tasks_count || Math.floor(Math.random() * 30) + 5 };
    case 'documents':
      return { items_synced: Math.floor(Math.random() * 10) + 2 };
    case 'notice':
      return { items_synced: 1 };
    default:
      return { items_synced: 0 };
  }
}
