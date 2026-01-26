import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkEstimation {
  name: string;
  quantity: string;
  unit: string;
  costMin: number;
  costMax: number;
  priority: 'low' | 'medium' | 'high';
  reason?: string;
  dependencies?: string[];
}

export interface EstimationResult {
  works: WorkEstimation[];
  globalBudgetMin: number;
  globalBudgetMax: number;
  complexityLevel: 'low' | 'medium' | 'high';
}

export interface EstimationResponse {
  estimation: EstimationResult;
  savedId?: string;
  buildingContext?: {
    address: string;
    surface?: number;
    floorsEstimated?: number;
  };
}

export const useExteriorWorkEstimation = () => {
  const [estimation, setEstimation] = useState<EstimationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimateWorks = useCallback(async (params: {
    externalAnalysisId?: string;
    snapshotId?: string;
    projectId?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('estimate-exterior-works', {
        body: params,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setEstimation(data);
      return data;
    } catch (err) {
      console.error('Estimation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'estimation';
      setError(errorMessage);
      setEstimation(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPriorityColor = useCallback((priority: string): string => {
    const colors: Record<string, string> = {
      'low': 'text-emerald-600',
      'medium': 'text-amber-600',
      'high': 'text-red-600',
    };
    return colors[priority] || 'text-muted-foreground';
  }, []);

  const getPriorityBgColor = useCallback((priority: string): string => {
    const colors: Record<string, string> = {
      'low': 'bg-emerald-500/10 border-emerald-500/30',
      'medium': 'bg-amber-500/10 border-amber-500/30',
      'high': 'bg-red-500/10 border-red-500/30',
    };
    return colors[priority] || 'bg-muted/10 border-border/30';
  }, []);

  const getPriorityLabel = useCallback((priority: string): string => {
    const labels: Record<string, string> = {
      'low': 'Faible',
      'medium': 'Moyenne',
      'high': 'Élevée',
    };
    return labels[priority] || priority;
  }, []);

  const getComplexityLabel = useCallback((complexity: string): string => {
    const labels: Record<string, string> = {
      'low': 'Simple',
      'medium': 'Modérée',
      'high': 'Complexe',
    };
    return labels[complexity] || complexity;
  }, []);

  const getComplexityColor = useCallback((complexity: string): string => {
    const colors: Record<string, string> = {
      'low': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      'medium': 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      'high': 'bg-red-500/10 text-red-600 border-red-500/30',
    };
    return colors[complexity] || '';
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const clearEstimation = useCallback(() => {
    setEstimation(null);
    setError(null);
  }, []);

  return {
    estimation,
    isLoading,
    error,
    estimateWorks,
    getPriorityColor,
    getPriorityBgColor,
    getPriorityLabel,
    getComplexityLabel,
    getComplexityColor,
    formatCurrency,
    clearEstimation,
  };
};
