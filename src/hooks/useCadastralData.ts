import { useState, useCallback } from 'react';

export interface CadastralParcel {
  id: string;
  numero: string;
  section: string;
  prefixe: string;
  commune: string;
  contenance: number; // surface in m²
  codeInsee: string;
  codeDepartement: string;
  geometry?: {
    type: string;
    coordinates: number[][][];
  };
}

export interface CadastralData {
  parcels: CadastralParcel[];
  communeCode: string;
  communeName: string;
  departement: string;
}

export const useCadastralData = () => {
  const [cadastralData, setCadastralData] = useState<CadastralData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCadastralData = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the IGN apicarto API - correct format with Point geometry
      const geom = JSON.stringify({
        type: "Point",
        coordinates: [lon, lat]
      });
      
      const response = await fetch(
        `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(geom)}`
      );

      if (!response.ok) {
        throw new Error('Impossible de récupérer les données cadastrales');
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const parcels: CadastralParcel[] = data.features.map((feature: any) => ({
          id: feature.properties.id || `${feature.properties.code_insee}-${feature.properties.section}-${feature.properties.numero}`,
          numero: feature.properties.numero,
          section: feature.properties.section,
          prefixe: feature.properties.code_arr || feature.properties.com_abs || '',
          commune: feature.properties.nom_com || '',
          codeInsee: feature.properties.code_insee || '',
          codeDepartement: feature.properties.code_dep || '',
          contenance: feature.properties.contenance || 0,
          geometry: feature.geometry,
        }));

        const firstParcel = data.features[0].properties;
        
        setCadastralData({
          parcels,
          communeCode: firstParcel.code_insee || '',
          communeName: firstParcel.nom_com || '',
          departement: firstParcel.code_dep || '',
        });
      } else {
        setCadastralData(null);
        setError('Aucune parcelle trouvée à cette adresse');
      }
    } catch (err) {
      console.error('Cadastral fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setCadastralData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCadastralPlanUrl = useCallback((communeCode: string, section?: string, numero?: string) => {
    // Generate cadastre.gouv.fr URL for the parcel
    if (section && numero) {
      return `https://www.cadastre.gouv.fr/scpc/rechercherParReferences.do?commune=${communeCode}&section=${section}&parcelle=${numero}`;
    }
    return `https://www.cadastre.gouv.fr/scpc/accueil.do?commune=${communeCode}`;
  }, []);

  // Generate cadastre map URL (WMS tiles)
  const getCadastralMapUrl = useCallback((lat: number, lon: number, zoom: number = 18) => {
    // Use the cadastre.data.gouv.fr map viewer
    return `https://cadastre.data.gouv.fr/map?lat=${lat}&lon=${lon}&zoom=${zoom}`;
  }, []);

  // Get WMS tile URL for embedding
  const getCadastralWmsTileUrl = useCallback((bbox: string) => {
    // WMS URL for cadastral parcels from IGN Géoportail
    return `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=512&HEIGHT=512`;
  }, []);

  return {
    cadastralData,
    isLoading,
    error,
    fetchCadastralData,
    getCadastralPlanUrl,
    getCadastralMapUrl,
    getCadastralWmsTileUrl,
  };
};
