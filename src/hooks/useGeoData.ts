import { useState, useCallback } from 'react';

export interface GeoEnrichedData {
  // Geographic coordinates
  latitude: number;
  longitude: number;
  altitude?: number;
  
  // Administrative
  codeInsee: string;
  codeDepartement: string;
  codeRegion: string;
  departement: string;
  region: string;
  
  // Population & stats
  population?: number;
  surface?: number; // km²
  
  // GPS formatted
  gpsFormatted: {
    dms: string; // Degrees Minutes Seconds
    dd: string;  // Decimal Degrees
  };
  
  // Compass orientation based on position relative to city center
  orientation?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO';
}

export const useGeoData = () => {
  const [geoData, setGeoData] = useState<GeoEnrichedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatToDMS = (decimal: number, isLatitude: boolean): string => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);
    
    const direction = isLatitude 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'O');
    
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  const fetchGeoData = useCallback(async (lat: number, lon: number, codeInsee?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get commune info from geo.api.gouv.fr
      let communeData: any = null;
      
      if (codeInsee) {
        const response = await fetch(
          `https://geo.api.gouv.fr/communes/${codeInsee}?fields=nom,code,codeDepartement,codeRegion,departement,region,population,surface,centre`
        );
        if (response.ok) {
          communeData = await response.json();
        }
      }
      
      // Fallback: reverse geocode to get commune
      if (!communeData) {
        const reverseResponse = await fetch(
          `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=nom,code,codeDepartement,codeRegion,departement,region,population,surface,centre`
        );
        if (reverseResponse.ok) {
          const communes = await reverseResponse.json();
          if (communes.length > 0) {
            communeData = communes[0];
          }
        }
      }

      // Try to get altitude from OpenTopoData API (more reliable than open-elevation)
      let altitude: number | undefined;
      try {
        const elevationResponse = await fetch(
          `https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lon}`
        );
        if (elevationResponse.ok) {
          const elevationData = await elevationResponse.json();
          if (elevationData.results && elevationData.results[0]) {
            altitude = elevationData.results[0].elevation;
          }
        }
      } catch {
        // Altitude not critical, continue without it
      }

      // Calculate orientation relative to commune center
      let orientation: GeoEnrichedData['orientation'];
      if (communeData?.centre?.coordinates) {
        const [centerLon, centerLat] = communeData.centre.coordinates;
        const dLat = lat - centerLat;
        const dLon = lon - centerLon;
        const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
        
        if (angle >= -22.5 && angle < 22.5) orientation = 'N';
        else if (angle >= 22.5 && angle < 67.5) orientation = 'NE';
        else if (angle >= 67.5 && angle < 112.5) orientation = 'E';
        else if (angle >= 112.5 && angle < 157.5) orientation = 'SE';
        else if (angle >= 157.5 || angle < -157.5) orientation = 'S';
        else if (angle >= -157.5 && angle < -112.5) orientation = 'SO';
        else if (angle >= -112.5 && angle < -67.5) orientation = 'O';
        else orientation = 'NO';
      }

      const enrichedData: GeoEnrichedData = {
        latitude: lat,
        longitude: lon,
        altitude,
        codeInsee: communeData?.code || codeInsee || '',
        codeDepartement: communeData?.codeDepartement || '',
        codeRegion: communeData?.codeRegion || '',
        departement: communeData?.departement?.nom || '',
        region: communeData?.region?.nom || '',
        population: communeData?.population,
        surface: communeData?.surface,
        gpsFormatted: {
          dms: `${formatToDMS(lat, true)} ${formatToDMS(lon, false)}`,
          dd: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        },
        orientation,
      };

      setGeoData(enrichedData);
    } catch (err) {
      console.error('Geo data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      
      // Set minimal data on error
      setGeoData({
        latitude: lat,
        longitude: lon,
        codeInsee: codeInsee || '',
        codeDepartement: '',
        codeRegion: '',
        departement: '',
        region: '',
        gpsFormatted: {
          dms: `${formatToDMS(lat, true)} ${formatToDMS(lon, false)}`,
          dd: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    geoData,
    isLoading,
    error,
    fetchGeoData,
  };
};
