import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePaginatedSequencesOptions {
  projectId: string;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Hook pour charger les séquences de visite par pagination
 * Optimise le chargement initial en chargeant seulement la première page
 */
export function usePaginatedSequences({
  projectId,
  pageSize = 20,
  enabled = true
}: UsePaginatedSequencesOptions) {
  const [page, setPage] = useState(0);
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPage = useCallback(async (pageNum: number) => {
    if (!enabled || !projectId) return;

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);
      
      if (fetchError) throw fetchError;
      
      if (data && data.length > 0) {
        setSequences(prev => {
          // Éviter les doublons
          const existingIds = new Set(prev.map(s => s.id));
          const newSequences = data.filter(s => !existingIds.has(s.id));
          return [...prev, ...newSequences];
        });
        setHasMore(data.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('[usePaginatedSequences] Error loading sequences:', err);
      setError(err instanceof Error ? err : new Error('Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  }, [projectId, pageSize, enabled]);

  // Charger la première page au montage
  useEffect(() => {
    if (enabled && projectId) {
      setPage(0);
      setSequences([]);
      setHasMore(true);
      loadPage(0);
    }
  }, [projectId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!loading && hasMore && enabled) {
      const nextPage = page + 1;
      loadPage(nextPage);
      setPage(nextPage);
    }
  }, [page, loading, hasMore, enabled, loadPage]);

  const reset = useCallback(() => {
    setPage(0);
    setSequences([]);
    setHasMore(true);
    setError(null);
    if (enabled && projectId) {
      loadPage(0);
    }
  }, [projectId, enabled, loadPage]);

  return {
    sequences,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    page,
  };
}
