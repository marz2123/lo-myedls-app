import { useState, useCallback } from 'react';

export interface PLUZone {
  code: string;
  libelle: string;
  typezone: string;
  destdomi: string;
  hauteurmax?: number;
  densitemax?: number;
}

export interface ABFPerimeter {
  inPerimeter: boolean;
  type?: string;
  name?: string;
  distance?: number;
}

export interface PLUData {
  zone: PLUZone | null;
  abf: ABFPerimeter;
  reglementUrl?: string;
  communeHasPLU: boolean;
  lastUpdate: string;
}

// Zone type descriptions
const ZONE_TYPES: Record<string, string> = {
  'U': 'Zone Urbaine - Construction autorisée',
  'AU': 'Zone À Urbaniser - Urbanisation future',
  'A': 'Zone Agricole - Construction très limitée',
  'N': 'Zone Naturelle - Protection',
  'Ua': 'Centre-ville historique',
  'Ub': 'Zone urbaine mixte',
  'Uc': 'Zone pavillonnaire',
  'AUa': 'À urbaniser court terme',
  'AUb': 'À urbaniser moyen terme',
};

export const usePLUData = () => {
  const [pluData, setPLUData] = useState<PLUData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPLUData = useCallback(async (lat: number, lon: number, codeInsee?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let zone: PLUZone | null = null;
      let abf: ABFPerimeter = { inPerimeter: false };
      let communeHasPLU = false;

      // Try GPU (Géoportail de l'Urbanisme) WFS service
      try {
        const gpuUrl = `https://www.geoportail-urbanisme.gouv.fr/api/v1/document?lat=${lat}&lon=${lon}`;
        const gpuResponse = await fetch(gpuUrl, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (gpuResponse.ok) {
          const gpuData = await gpuResponse.json();
          if (gpuData.documents && gpuData.documents.length > 0) {
            communeHasPLU = true;
            const pluDoc = gpuData.documents.find((d: any) => 
              d.type === 'PLU' || d.type === 'PLUi' || d.type === 'POS'
            );
            if (pluDoc) {
              zone = {
                code: pluDoc.zonage?.code || 'U',
                libelle: pluDoc.zonage?.libelle || ZONE_TYPES[pluDoc.zonage?.code] || 'Zone urbaine',
                typezone: pluDoc.zonage?.typezone || 'U',
                destdomi: pluDoc.zonage?.destdomi || 'Habitat',
              };
            }
          }
        }
      } catch {
        // GPU API may not be available
      }

      // Fallback: Use Overpass to check for ABF zones (monuments historiques)
      try {
        const abfQuery = `
          [out:json][timeout:10];
          (
            way["historic"](around:500,${lat},${lon});
            node["historic"](around:500,${lat},${lon});
            way["heritage"](around:500,${lat},${lon});
          );
          out count;
        `;
        
        const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `data=${encodeURIComponent(abfQuery)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (overpassResponse.ok) {
          const overpassData = await overpassResponse.json();
          const totalHistoric = overpassData.elements?.length || 0;
          
          if (totalHistoric > 0) {
            abf = {
              inPerimeter: true,
              type: 'Proximité monument historique',
              distance: 500,
            };
          }
        }
      } catch {
        // ABF check not critical
      }

      // If no zone found, set default urban zone
      if (!zone) {
        zone = {
          code: 'U',
          libelle: 'Zone Urbaine (estimation)',
          typezone: 'U',
          destdomi: 'Mixte',
        };
      }

      setPLUData({
        zone,
        abf,
        communeHasPLU,
        lastUpdate: new Date().toISOString(),
      });
    } catch (err) {
      console.error('PLU fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setPLUData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getZoneDescription = useCallback((code: string): string => {
    return ZONE_TYPES[code] || ZONE_TYPES[code.charAt(0)] || 'Zone non définie';
  }, []);

  return {
    pluData,
    isLoading,
    error,
    fetchPLUData,
    getZoneDescription,
  };
};
