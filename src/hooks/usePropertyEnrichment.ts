import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PropertyEnrichmentRequest, PropertyEnrichmentResponse } from '@/types/propertyEnrichment';

export const usePropertyEnrichment = () => {
  const [data, setData] = useState<PropertyEnrichmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichProperty = useCallback(async (request: PropertyEnrichmentRequest) => {
    if (!request.address && (request.latitude === undefined || request.longitude === undefined)) {
      setError('Adresse ou coordonnées requises');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'property-enrichment',
        {
          body: request
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      setData(responseData as PropertyEnrichmentResponse);
      return responseData as PropertyEnrichmentResponse;
    } catch (err) {
      console.error('Error enriching property:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'enrichissement des données';
      setError(errorMessage);
      setData(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  // Helper to check source status
  const getSourceStatusSummary = useCallback(() => {
    if (!data?.sourceStatus) return null;

    const status = data.sourceStatus;
    const total = Object.keys(status).length;
    const ok = Object.values(status).filter(s => s === 'OK').length;
    const errors = Object.values(status).filter(s => s === 'ERROR').length;
    const empty = Object.values(status).filter(s => s === 'EMPTY').length;
    const skipped = Object.values(status).filter(s => s === 'SKIPPED').length;

    return {
      total,
      ok,
      errors,
      empty,
      skipped,
      successRate: Math.round((ok / total) * 100)
    };
  }, [data]);

  return {
    data,
    isLoading,
    error,
    enrichProperty,
    clearData,
    getSourceStatusSummary,
  };
};
