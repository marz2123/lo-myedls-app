import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DataGap {
  field: string;
  category: string;
  description: string;
  currentValue: any;
}

interface FilledDataItem {
  data: any;
  source: string;
  confidence: number;
  fetchedAt: string;
}

interface SmartFillerResult {
  success: boolean;
  filledData: Record<string, FilledDataItem>;
  sourcesUsed: Array<{ field: string; source: string; success: boolean }>;
  aiSuggestions: string[];
  learningData: {
    gapsAnalyzed: number;
    gapsFilled: number;
    successRate: number;
  };
  message: string;
}

export const useSmartDataFiller = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<SmartFillerResult | null>(null);

  const detectGaps = useCallback((data: Record<string, any>): DataGap[] => {
    const gaps: DataGap[] = [];

    // Check geo data - altitude
    if (!data.geoData?.altitude) {
      gaps.push({ field: 'altitude', category: 'altitude', description: 'Altitude du terrain', currentValue: null });
    }

    // Check street imagery
    if (!data.streetImageryData?.images?.length) {
      gaps.push({ field: 'streetImages', category: 'streetImages', description: 'Images de rue', currentValue: null });
    }

    // Check cadastre - comprehensive
    if (!data.cadastralData?.parcels?.length) {
      gaps.push({ field: 'cadastre', category: 'cadastre', description: 'Données cadastrales', currentValue: null });
    }

    // Check risks - comprehensive
    if (!data.riskData?.risks) {
      gaps.push({ field: 'risks', category: 'risks', description: 'Risques environnementaux', currentValue: null });
    }

    // Check climate
    if (!data.meteoData?.climate) {
      gaps.push({ field: 'climate', category: 'climate', description: 'Données climatiques', currentValue: null });
    }

    // Check building info from BDNB or urban data
    const hasBuilding = data.bdnbData || data.urbanData?.data?.buildingType;
    if (!hasBuilding) {
      gaps.push({ field: 'buildingInfo', category: 'buildingInfo', description: 'Informations bâtiment', currentValue: null });
    }

    // Check DVF/transactions
    if (!data.dvfData?.transactions?.length) {
      gaps.push({ field: 'transactions', category: 'transactions', description: 'Historique transactions', currentValue: null });
    }

    // Check urbanisme/PLU
    if (!data.enrichmentData?.urbanism) {
      gaps.push({ field: 'urbanisme', category: 'urbanisme', description: 'Données urbanisme/PLU', currentValue: null });
    }

    // Check owners - Pappers
    if (!data.pappersData?.proprietaires?.length && !data.pappersData?.entreprise) {
      gaps.push({ field: 'owners', category: 'owners', description: 'Données propriétaires', currentValue: null });
    }

    // Check neighborhood/POIs - comprehensive check
    const neighborhoodPOIs = data.neighborhoodData;
    const hasPOIs = neighborhoodPOIs?.amenities && (
      (neighborhoodPOIs.amenities.transport?.count > 0) ||
      (neighborhoodPOIs.amenities.commerce?.count > 0) ||
      (neighborhoodPOIs.amenities.loisirs?.count > 0) ||
      (neighborhoodPOIs.amenities.education?.count > 0) ||
      (neighborhoodPOIs.amenities.sante?.count > 0) ||
      (neighborhoodPOIs.amenities.services?.count > 0)
    );
    if (!hasPOIs) {
      gaps.push({ field: 'neighborhood', category: 'neighborhood', description: 'Points d\'intérêt du quartier', currentValue: null });
    }

    // Check urban context - building details
    const urbanContext = data.urbanData?.data;
    if (!urbanContext?.buildingType && !urbanContext?.buildingLevels && !urbanContext?.buildingYear) {
      gaps.push({ field: 'urbanContext', category: 'buildingInfo', description: 'Contexte urbain bâtiment', currentValue: null });
    }

    // Check aerial imagery
    if (!data.aerialData?.images?.length) {
      gaps.push({ field: 'aerialImages', category: 'aerialImages', description: 'Images aériennes/satellite', currentValue: null });
    }

    return gaps;
  }, []);

  const fillGaps = useCallback(async (
    gaps: DataGap[],
    latitude: number,
    longitude: number,
    address: string,
    codeInsee?: string,
    existingData?: Record<string, any>
  ): Promise<SmartFillerResult | null> => {
    if (gaps.length === 0) {
      toast.success('Toutes les données sont complètes!');
      return null;
    }

    setIsAnalyzing(true);
    
    try {
      toast.info(`🔍 Analyse de ${gaps.length} champs manquants...`, {
        duration: 3000
      });

      const { data, error } = await supabase.functions.invoke('smart-data-filler', {
        body: {
          gaps,
          latitude,
          longitude,
          address,
          codeInsee,
          existingData
        }
      });

      if (error) throw error;

      const result = data as SmartFillerResult;
      setLastResult(result);

      if (result.success) {
        const filledCount = result.learningData?.gapsFilled || 0;
        const totalGaps = gaps.length;
        
        if (filledCount > 0) {
          toast.success(
            `✅ ${filledCount}/${totalGaps} champs remplis automatiquement`,
            { duration: 4000 }
          );
        }

        if (result.aiSuggestions?.length > 0) {
          toast.info(
            `💡 ${result.aiSuggestions.length} suggestions IA pour améliorer les données`,
            { duration: 5000 }
          );
        }

        // Log learning data for debugging
        console.log('📈 Smart Data Filler Learning:', result.learningData);
      }

      return result;
    } catch (error) {
      console.error('Smart data filler error:', error);
      toast.error('Erreur lors de l\'analyse des données manquantes');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeAndFill = useCallback(async (
    allData: Record<string, any>,
    latitude: number,
    longitude: number,
    address: string,
    codeInsee?: string
  ) => {
    const gaps = detectGaps(allData);
    
    if (gaps.length === 0) {
      console.log('✅ All data complete, no gaps detected');
      return null;
    }

    console.log(`🔍 Detected ${gaps.length} data gaps:`, gaps.map(g => g.field));
    
    return fillGaps(gaps, latitude, longitude, address, codeInsee, allData);
  }, [detectGaps, fillGaps]);

  return {
    isAnalyzing,
    lastResult,
    detectGaps,
    fillGaps,
    analyzeAndFill
  };
};
