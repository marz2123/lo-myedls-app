import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExternalBuildingAnalysis {
  buildingType: 'haussmannien' | 'ancien' | '1930' | '1970' | 'récent' | 'inconnu';
  floorsEstimated: number;
  facadeMaterial: 'pierre' | 'brique' | 'enduit' | 'béton' | 'mixte' | 'inconnu';
  facadeState: 'bon' | 'moyen' | 'mauvais' | 'critique';
  facadePathologies: string[];
  roofMaterial: 'tuile' | 'zinc' | 'ardoise' | 'bac acier' | 'inconnu';
  roofState: 'bon' | 'moyen' | 'mauvais' | 'critique';
  balconies: 'présents' | 'absents' | 'inconnus';
  windowsType: 'simple vitrage' | 'double vitrage' | 'mixte' | 'inconnu';
  externalThermalWeaknesses: string[];
  potentialStructuralAlerts: string[];
  globalExteriorCondition: 'low' | 'medium' | 'high';
  commentsForWorkPlanning: string[];
}

export interface ExternalAnalysisResponse {
  analysis: ExternalBuildingAnalysis;
  imagesAnalyzed: string[];
  hasImages: boolean;
}

export const useExternalBuildingAnalysis = () => {
  const [analysis, setAnalysis] = useState<ExternalAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeBuilding = useCallback(async (params: {
    projectId?: string;
    snapshotId?: string;
    imageUrl?: string;
    lat?: number;
    lon?: number;
    address?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-building-ai', {
        body: params,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data);
      return data;
    } catch (err) {
      console.error('External building analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'analyse extérieure';
      setError(errorMessage);
      setAnalysis(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStateColor = useCallback((state: string): string => {
    const colors: Record<string, string> = {
      'bon': 'text-emerald-600',
      'moyen': 'text-amber-600',
      'mauvais': 'text-orange-600',
      'critique': 'text-red-600',
    };
    return colors[state] || 'text-muted-foreground';
  }, []);

  const getStateBgColor = useCallback((state: string): string => {
    const colors: Record<string, string> = {
      'bon': 'bg-emerald-500/10 border-emerald-500/30',
      'moyen': 'bg-amber-500/10 border-amber-500/30',
      'mauvais': 'bg-orange-500/10 border-orange-500/30',
      'critique': 'bg-red-500/10 border-red-500/30',
    };
    return colors[state] || 'bg-muted/10 border-border/30';
  }, []);

  const getConditionLabel = useCallback((condition: 'low' | 'medium' | 'high'): string => {
    const labels: Record<string, string> = {
      'low': 'Bon état général',
      'medium': 'Travaux modérés',
      'high': 'Rénovation importante',
    };
    return labels[condition] || condition;
  }, []);

  const getConditionColor = useCallback((condition: 'low' | 'medium' | 'high'): string => {
    const colors: Record<string, string> = {
      'low': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      'medium': 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      'high': 'bg-red-500/10 text-red-600 border-red-500/30',
    };
    return colors[condition] || '';
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isLoading,
    error,
    analyzeBuilding,
    getStateColor,
    getStateBgColor,
    getConditionLabel,
    getConditionColor,
    clearAnalysis,
  };
};
