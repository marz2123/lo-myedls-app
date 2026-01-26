import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BuildingAnalysis {
  buildingType: string;
  estimatedFloors: number;
  constructionEra: string;
  facadeMaterial: string;
  facadeCondition: string;
  pathologies: string[];
  estimatedDPE: string;
  hasElevator: string;
  roofType: string;
  roofCondition: string;
  estimatedFacadeArea: number;
  confidenceScore: number;
  recommendations: string[];
  // Urbanisme et réglementaire
  arretePéril?: string;
  permisConstructionHistorique?: string;
  travauxRecentsProbables?: string;
  zonePLU?: string;
  // Lots et destination
  lotsAppartements?: number | string;
  lotsGarages?: number | string;
  lotsAnnexes?: number | string;
  lotsCommerces?: number | string;
  totalLots?: number | string;
  destinationBien?: string;
  // Source des données
  lotsDataSource?: 'bdnb' | 'rnc' | 'estimation';
  bdnbId?: string;
}

export interface AIAnalysisResponse {
  analysis: BuildingAnalysis;
  analyzedAt: string;
  imageUsed: boolean;
}

export const useBuildingAIAnalysis = () => {
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeBuilding = useCallback(async (
    lat: number,
    lon: number,
    address?: string,
    imageUrl?: string
  ) => {
    console.log('[useBuildingAIAnalysis] Starting analysis', { lat, lon, address, hasImage: !!imageUrl });
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-building-ai', {
        body: {
          lat,
          lon,
          address,
          imageUrl,
        },
      });

      console.log('[useBuildingAIAnalysis] Response received', { data, fnError });

      if (fnError) {
        console.error('[useBuildingAIAnalysis] Function error:', fnError);
        throw new Error(fnError.message);
      }

      if (data?.error) {
        console.error('[useBuildingAIAnalysis] Data error:', data.error);
        throw new Error(data.error);
      }

      if (!data?.analysis) {
        console.error('[useBuildingAIAnalysis] No analysis in response:', data);
        throw new Error('Pas de données d\'analyse reçues');
      }

      console.log('[useBuildingAIAnalysis] Analysis data:', JSON.stringify(data.analysis));

      setAIAnalysis({
        analysis: data.analysis,
        analyzedAt: new Date().toISOString(),
        imageUsed: data.hasImages || !!imageUrl,
      });
    } catch (err) {
      console.error('[useBuildingAIAnalysis] Error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse IA');
      setAIAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getConditionColor = useCallback((condition: string): string => {
    const lower = condition.toLowerCase();
    if (lower.includes('excellent')) return 'text-emerald-600';
    if (lower.includes('bon')) return 'text-green-600';
    if (lower.includes('moyen')) return 'text-amber-600';
    if (lower.includes('dégradé')) return 'text-orange-600';
    if (lower.includes('très dégradé')) return 'text-red-600';
    return 'text-muted-foreground';
  }, []);

  const getDPEColor = useCallback((dpe: string): string => {
    const colors: Record<string, string> = {
      'A': 'bg-green-500',
      'B': 'bg-lime-500',
      'C': 'bg-yellow-400',
      'D': 'bg-amber-500',
      'E': 'bg-orange-500',
      'F': 'bg-red-500',
      'G': 'bg-red-700',
    };
    return colors[dpe.toUpperCase()] || 'bg-gray-400';
  }, []);

  return {
    aiAnalysis,
    isLoading,
    error,
    analyzeBuilding,
    getConditionColor,
    getDPEColor,
  };
};
