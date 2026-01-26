import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StreetImage {
  id: string;
  thumbnailUrl?: string;
  fullUrl?: string;
  capturedAt?: number;
  source: 'mapillary' | 'kartaview' | 'wikimedia' | 'panoramax';
  coordinates: [number, number];
  isPanorama?: boolean;
}

export interface StreetImageryResponse {
  images: StreetImage[];
  closestImage?: StreetImage;
  viewerUrl?: string;
  source: string;
  fallbackUsed: boolean;
}

export const useStreetImagery = () => {
  const [data, setData] = useState<StreetImageryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching street imagery via edge function...');
      
      const { data: response, error: fetchError } = await supabase.functions.invoke(
        'fetch-street-imagery',
        { body: { lat, lon } }
      );

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const result: StreetImageryResponse = {
        images: response.images || [],
        closestImage: response.closestImage,
        viewerUrl: response.viewerUrl || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
        source: response.source || 'Aucune source',
        fallbackUsed: response.fallbackUsed ?? true,
      };

      console.log(`✅ ${result.source}: ${result.images.length} images found`);
      setData(result);
      return result;
    } catch (err) {
      console.error('Street imagery fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      
      // Return fallback to Google Street View
      const fallbackResult: StreetImageryResponse = {
        images: [],
        viewerUrl: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
        source: 'Google Street View (externe)',
        fallbackUsed: true,
      };
      setData(fallbackResult);
      return fallbackResult;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchImages,
  };
};
