import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExteriorFtCtStTask {
  id: string;
  estimation_id: string;
  project_id: string | null;
  work_name: string;
  work_quantity: string | null;
  work_unit: string | null;
  cost_min: number | null;
  cost_max: number | null;
  priority: string | null;
  reason: string | null;
  ft_family: string;
  ct_category: string;
  st_subcategory: string;
  description: string | null;
  dependencies: unknown;
  created_at: string;
  updated_at: string;
}

export interface GenerateTasksResponse {
  success: boolean;
  tasksCount: number;
  tasks: ExteriorFtCtStTask[];
}

export const useExteriorFtCtStTasks = () => {
  const [tasks, setTasks] = useState<ExteriorFtCtStTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTasks = useCallback(async (params: {
    exteriorWorkEstimationId: string;
    projectId?: string;
  }) => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-ft-ct-st-from-exterior', {
        body: params,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setTasks(data.tasks || []);
      return data as GenerateTasksResponse;
    } catch (err) {
      console.error('Generate FT/CT/ST tasks error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la génération';
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const loadTasks = useCallback(async (estimationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('exterior_ft_ct_st_tasks')
        .select('*')
        .eq('estimation_id', estimationId)
        .order('created_at', { ascending: true });

      if (queryError) {
        throw new Error(queryError.message);
      }

      setTasks(data || []);
      return data;
    } catch (err) {
      console.error('Load FT/CT/ST tasks error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPriorityColor = useCallback((priority: string | null): string => {
    const colors: Record<string, string> = {
      'low': 'text-emerald-600',
      'medium': 'text-amber-600',
      'high': 'text-red-600',
    };
    return colors[priority || ''] || 'text-muted-foreground';
  }, []);

  const getPriorityBgColor = useCallback((priority: string | null): string => {
    const colors: Record<string, string> = {
      'low': 'bg-emerald-500/10 border-emerald-500/30',
      'medium': 'bg-amber-500/10 border-amber-500/30',
      'high': 'bg-red-500/10 border-red-500/30',
    };
    return colors[priority || ''] || 'bg-muted/10 border-border/30';
  }, []);

  const getPriorityLabel = useCallback((priority: string | null): string => {
    const labels: Record<string, string> = {
      'low': 'Faible',
      'medium': 'Moyenne',
      'high': 'Élevée',
    };
    return labels[priority || ''] || priority || 'Non définie';
  }, []);

  const formatCurrency = useCallback((amount: number | null): string => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
    setError(null);
  }, []);

  return {
    tasks,
    isLoading,
    isGenerating,
    error,
    generateTasks,
    loadTasks,
    getPriorityColor,
    getPriorityBgColor,
    getPriorityLabel,
    formatCurrency,
    clearTasks,
  };
};
