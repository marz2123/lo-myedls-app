import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MapillaryImage {
  id: string;
  thumb_256_url?: string;
  thumb_1024_url?: string;
  thumb_2048_url?: string;
  captured_at: number;
  compass_angle: number;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  is_pano: boolean;
}

export interface MapillaryResponse {
  images: MapillaryImage[];
  closestImage?: MapillaryImage;
  panoramaUrl?: string;
}

export const useMapillary = () => {
  const [mapillaryData, setMapillaryData] = useState<MapillaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreetImages = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching Mapillary images via edge function...');
      
      const { data: response, error: fetchError } = await supabase.functions.invoke(
        'fetch-street-imagery',
        { body: { lat, lon } }
      );

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Transform response to match MapillaryResponse interface
      const images: MapillaryImage[] = (response.images || [])
        .filter((img: any) => img.source === 'mapillary')
        .map((img: any) => ({
          id: img.id,
          thumb_256_url: img.thumbnailUrl,
          thumb_1024_url: img.fullUrl,
          captured_at: img.capturedAt,
          compass_angle: img.compassAngle || 0,
          geometry: {
            type: 'Point',
            coordinates: img.coordinates,
          },
          is_pano: img.isPanorama || false,
        }));

      // Find closest Mapillary image
      const closestImage = images.length > 0 ? images.reduce((closest, img) => {
        if (!closest) return img;
        const distCurrent = Math.sqrt(
          Math.pow(img.geometry.coordinates[0] - lon, 2) +
          Math.pow(img.geometry.coordinates[1] - lat, 2)
        );
        const distClosest = Math.sqrt(
          Math.pow(closest.geometry.coordinates[0] - lon, 2) +
          Math.pow(closest.geometry.coordinates[1] - lat, 2)
        );
        return distCurrent < distClosest ? img : closest;
      }, null as MapillaryImage | null) : undefined;

      // Also include Panoramax/other sources as fallback for closestImage
      let fallbackClosest: MapillaryImage | undefined;
      if (!closestImage && response.closestImage) {
        fallbackClosest = {
          id: response.closestImage.id,
          thumb_256_url: response.closestImage.thumbnailUrl,
          thumb_1024_url: response.closestImage.fullUrl,
          captured_at: response.closestImage.capturedAt || Date.now(),
          compass_angle: response.closestImage.compassAngle || 0,
          geometry: {
            type: 'Point',
            coordinates: response.closestImage.coordinates,
          },
          is_pano: response.closestImage.isPanorama || false,
        };
      }

      const result: MapillaryResponse = {
        images,
        closestImage: closestImage || fallbackClosest,
        panoramaUrl: response.viewerUrl || `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`,
      };

      console.log(`✅ Mapillary: ${images.length} images, source: ${response.source}`);
      setMapillaryData(result);
      return result;
    } catch (err) {
      console.error('Mapillary fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      
      // Fallback response
      const fallbackResult: MapillaryResponse = {
        images: [],
        panoramaUrl: `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`,
      };
      setMapillaryData(fallbackResult);
      return fallbackResult;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getEmbedUrl = useCallback((imageId: string): string => {
    return `https://www.mapillary.com/embed?image_key=${imageId}&style=photo`;
  }, []);

  return {
    mapillaryData,
    isLoading,
    error,
    fetchStreetImages,
    getEmbedUrl,
  };
};
