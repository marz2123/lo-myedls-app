import { useState, useCallback } from 'react';

export interface AerialImageryData {
  osmStaticMapUrl: string;
  satelliteUrl: string;
  hybridUrl: string;
  parcelOverlayUrl?: string;
  coverage?: {
    hasAerial: boolean;
    resolution?: string;
    date?: string;
  };
  detectedFeatures?: {
    vegetation: boolean;
    roofType?: string;
    buildingFootprint?: number;
    parkingSpots?: number;
    pool?: boolean;
  };
  lastUpdate: string;
}

export const useAerialImagery = () => {
  const [aerialData, setAerialData] = useState<AerialImageryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAerialImagery = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate various map URLs
      const zoom = 18;
      const size = '600x400';
      
      // OSM Static Map (plan view)
      const osmStaticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=${size}&maptype=osmarenderer&markers=${lat},${lon},red-pushpin`;
      
      // Satellite imagery from ArcGIS World Imagery (free tier)
      const satelliteUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lon - 0.002},${lat - 0.0015},${lon + 0.002},${lat + 0.0015}&bboxSR=4326&imageSR=4326&size=600,400&format=png&f=image`;
      
      // Hybrid (satellite + labels) from ArcGIS
      const hybridUrl = `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/${zoom}/${Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))}/${Math.floor((lon + 180) / 360 * Math.pow(2, zoom))}`;

      // Cadastre overlay URL - using IGN WMS for parcel boundaries
      const parcelOverlayUrl = `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&CRS=EPSG:4326&BBOX=${lat - 0.001},${lon - 0.001},${lat + 0.001},${lon + 0.001}&WIDTH=512&HEIGHT=512`;

      // Try to detect building features from OSM
      let detectedFeatures;
      try {
        const overpassQuery = `
          [out:json][timeout:10];
          (
            way["building"](around:50,${lat},${lon});
            node["leisure"="swimming_pool"](around:100,${lat},${lon});
            way["leisure"="swimming_pool"](around:100,${lat},${lon});
            way["landuse"="grass"](around:100,${lat},${lon});
            node["amenity"="parking"](around:100,${lat},${lon});
          );
          out body;
        `;
        
        const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `data=${encodeURIComponent(overpassQuery)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (overpassResponse.ok) {
          const data = await overpassResponse.json();
          const elements = data.elements || [];
          
          const buildings = elements.filter((e: any) => e.tags?.building);
          const pools = elements.filter((e: any) => e.tags?.leisure === 'swimming_pool');
          const parking = elements.filter((e: any) => e.tags?.amenity === 'parking');
          const vegetation = elements.filter((e: any) => e.tags?.landuse === 'grass' || e.tags?.natural === 'tree');
          
          detectedFeatures = {
            vegetation: vegetation.length > 0,
            roofType: buildings[0]?.tags?.['roof:material'] || buildings[0]?.tags?.['building:material'],
            buildingFootprint: buildings[0]?.tags?.['building:levels'] ? parseInt(buildings[0].tags['building:levels']) * 80 : undefined,
            parkingSpots: parking.length > 0 ? parking.length * 5 : 0,
            pool: pools.length > 0,
          };
        }
      } catch {
        // Feature detection is optional
      }

      setAerialData({
        osmStaticMapUrl,
        satelliteUrl,
        hybridUrl,
        parcelOverlayUrl,
        coverage: {
          hasAerial: true,
          resolution: 'Haute résolution',
          date: new Date().getFullYear().toString(),
        },
        detectedFeatures,
        lastUpdate: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Aerial imagery fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setAerialData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    aerialData,
    isLoading,
    error,
    fetchAerialImagery,
  };
};
