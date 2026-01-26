import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DetectedAnomaly {
  id: string;
  anomaly_type: string;
  severity: string;
  description: string;
  confidence_score: number | null;
  frame_id: string | null;
  visit_session_id: string | null;
  detection_metadata: any;
  is_confirmed: boolean;
  created_at: string;
}

interface UseItemAnomaliesResult {
  anomalies: DetectedAnomaly[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useItemAnomalies(
  projectId: string | undefined,
  itemId: string | undefined,
  itemType: 'sequence' | 'frame' | undefined
): UseItemAnomaliesResult {
  const [anomalies, setAnomalies] = useState<DetectedAnomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    if (!projectId || !itemId) {
      setAnomalies([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('detected_anomalies')
        .select('*')
        .eq('project_id', projectId);

      if (itemType === 'sequence') {
        query = query.eq('visit_session_id', itemId);
      } else if (itemType === 'frame') {
        query = query.eq('frame_id', itemId);
      }

      const { data, error: fetchError } = await query.order('severity', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAnomalies((data || []) as DetectedAnomaly[]);
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, [projectId, itemId, itemType]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  return { anomalies, loading, error, refetch: fetchAnomalies };
}

// Hook to fetch anomaly counts for multiple items at once
export function useAnomalyCounts(projectId: string | undefined): {
  counts: Map<string, number>;
  loading: boolean;
} {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setCounts(new Map());
      return;
    }

    const fetchCounts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('detected_anomalies')
          .select('visit_session_id, frame_id')
          .eq('project_id', projectId);

        if (error) throw error;

        const countMap = new Map<string, number>();
        (data || []).forEach((item: any) => {
          const key = item.visit_session_id || item.frame_id;
          if (key) {
            countMap.set(key, (countMap.get(key) || 0) + 1);
          }
        });

        setCounts(countMap);
      } catch (err) {
        console.error('Error fetching anomaly counts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [projectId]);

  return { counts, loading };
}
