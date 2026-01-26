import { useState, useCallback } from 'react';

export interface UrbanContextData {
  // Building data from OSM
  buildingType?: string;
  buildingLevels?: number;
  buildingHeight?: number;
  buildingYear?: string;
  buildingMaterial?: string;
  
  // Neighborhood
  neighborhoodDensity?: 'Faible' | 'Moyenne' | 'Élevée';
  neighborhoodType?: string;
  avgBuildingHeight?: number;
  avgBuildingLevels?: number;
  
  // Urban zone
  zoneType?: string;
  pluZone?: string;
  
  // Nearby amenities count
  nearbyAmenities: {
    schools: number;
    shops: number;
    restaurants: number;
    healthcare: number;
    transport: number;
    parks: number;
  };
  
  // Address context
  streetType?: string;
  quarterName?: string;
}

export interface UrbanContextResponse {
  data: UrbanContextData;
  lastUpdate: string;
}

const BUILDING_TYPE_LABELS: Record<string, string> = {
  residential: 'Résidentiel',
  apartments: 'Immeuble d\'appartements',
  house: 'Maison individuelle',
  commercial: 'Commercial',
  retail: 'Commerce',
  industrial: 'Industriel',
  office: 'Bureau',
  warehouse: 'Entrepôt',
  public: 'Public',
  church: 'Église',
  school: 'École',
  hospital: 'Hôpital',
  yes: 'Bâtiment',
};

export const useUrbanContext = () => {
  const [urbanData, setUrbanData] = useState<UrbanContextResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrbanContext = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Query Overpass API for nearby buildings and amenities
      const radius = 100; // 100m radius for building
      const amenitiesRadius = 500; // 500m for amenities
      
      // Building query
      const buildingQuery = `
        [out:json][timeout:25];
        (
          way["building"](around:${radius},${lat},${lon});
          relation["building"](around:${radius},${lat},${lon});
        );
        out body;
      `;

      // Amenities query
      const amenitiesQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="school"](around:${amenitiesRadius},${lat},${lon});
          node["amenity"="kindergarten"](around:${amenitiesRadius},${lat},${lon});
          node["shop"](around:${amenitiesRadius},${lat},${lon});
          node["amenity"="restaurant"](around:${amenitiesRadius},${lat},${lon});
          node["amenity"="cafe"](around:${amenitiesRadius},${lat},${lon});
          node["amenity"="pharmacy"](around:${amenitiesRadius},${lat},${lon});
          node["amenity"="doctors"](around:${amenitiesRadius},${lat},${lon});
          node["amenity"="hospital"](around:${amenitiesRadius},${lat},${lon});
          node["public_transport"](around:${amenitiesRadius},${lat},${lon});
          node["leisure"="park"](around:${amenitiesRadius},${lat},${lon});
          way["leisure"="park"](around:${amenitiesRadius},${lat},${lon});
        );
        out count;
      `;

      const overpassUrl = 'https://overpass-api.de/api/interpreter';

      // Fetch building data
      const buildingResponse = await fetch(overpassUrl, {
        method: 'POST',
        body: `data=${encodeURIComponent(buildingQuery)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      let buildingData: any = null;
      let nearestBuilding: any = null;
      let avgLevels = 0;
      let avgHeight = 0;
      let buildingCount = 0;

      if (buildingResponse.ok) {
        buildingData = await buildingResponse.json();
        
        if (buildingData.elements && buildingData.elements.length > 0) {
          // Find the nearest building (assume first one for simplicity)
          nearestBuilding = buildingData.elements[0]?.tags || {};
          
          // Calculate averages
          buildingData.elements.forEach((el: any) => {
            if (el.tags) {
              buildingCount++;
              if (el.tags['building:levels']) {
                avgLevels += parseInt(el.tags['building:levels']) || 0;
              }
              if (el.tags.height) {
                avgHeight += parseFloat(el.tags.height) || 0;
              }
            }
          });
          
          if (buildingCount > 0) {
            avgLevels = Math.round(avgLevels / buildingCount);
            avgHeight = Math.round(avgHeight / buildingCount);
          }
        }
      }

      // Determine neighborhood density based on building count
      let neighborhoodDensity: 'Faible' | 'Moyenne' | 'Élevée' = 'Moyenne';
      if (buildingCount < 5) neighborhoodDensity = 'Faible';
      else if (buildingCount > 15) neighborhoodDensity = 'Élevée';

      // Try to get neighborhood name from Nominatim reverse geocoding
      let quarterName = '';
      let streetType = '';
      try {
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'MyEDLS/1.0',
            },
          }
        );
        
        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          quarterName = nominatimData.address?.neighbourhood || 
                        nominatimData.address?.suburb || 
                        nominatimData.address?.quarter || '';
          streetType = nominatimData.address?.road ? 'Rue' : 'Voie';
        }
      } catch {
        // Nominatim not critical
      }

      const data: UrbanContextData = {
        buildingType: BUILDING_TYPE_LABELS[nearestBuilding?.building] || nearestBuilding?.building,
        buildingLevels: nearestBuilding?.['building:levels'] ? parseInt(nearestBuilding['building:levels']) : undefined,
        buildingHeight: nearestBuilding?.height ? parseFloat(nearestBuilding.height) : undefined,
        buildingYear: nearestBuilding?.['start_date'] || nearestBuilding?.['building:year'] || undefined,
        buildingMaterial: nearestBuilding?.['building:material'] || undefined,
        neighborhoodDensity,
        neighborhoodType: buildingCount > 10 ? 'Urbain dense' : buildingCount > 5 ? 'Urbain' : 'Périurbain',
        avgBuildingHeight: avgHeight || undefined,
        avgBuildingLevels: avgLevels || undefined,
        nearbyAmenities: {
          schools: 0,
          shops: 0,
          restaurants: 0,
          healthcare: 0,
          transport: 0,
          parks: 0,
        },
        streetType,
        quarterName,
      };

      setUrbanData({
        data,
        lastUpdate: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Urban context fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      
      // Set default data on error
      setUrbanData({
        data: {
          nearbyAmenities: {
            schools: 0,
            shops: 0,
            restaurants: 0,
            healthcare: 0,
            transport: 0,
            parks: 0,
          },
        },
        lastUpdate: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    urbanData,
    isLoading,
    error,
    fetchUrbanContext,
  };
};
