import { useState, useCallback } from 'react';

export interface POI {
  id: string;
  name: string;
  type: string;
  category: string;
  distance: number;
  lat: number;
  lon: number;
}

export interface AmenityCategory {
  name: string;
  icon: string;
  count: number;
  items: POI[];
}

export interface NeighborhoodData {
  amenities: {
    education: AmenityCategory;
    commerce: AmenityCategory;
    transport: AmenityCategory;
    sante: AmenityCategory;
    loisirs: AmenityCategory;
    services: AmenityCategory;
  };
  walkScore: number;
  airQuality?: {
    aqi: number;
    level: 'Bon' | 'Modéré' | 'Mauvais' | 'Très mauvais';
    pm25?: number;
    pm10?: number;
  };
  greenSpaces: {
    count: number;
    nearestDistance: number;
    totalArea?: number;
  };
  lastUpdate: string;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const useNeighborhoodData = () => {
  const [neighborhoodData, setNeighborhoodData] = useState<NeighborhoodData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNeighborhoodData = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const radius = 1000; // 1km radius

      // Overpass query for all amenities
      const query = `
        [out:json][timeout:30];
        (
          // Education
          node["amenity"="school"](around:${radius},${lat},${lon});
          node["amenity"="kindergarten"](around:${radius},${lat},${lon});
          node["amenity"="college"](around:${radius},${lat},${lon});
          node["amenity"="university"](around:${radius},${lat},${lon});
          // Commerce
          node["shop"](around:${radius},${lat},${lon});
          node["amenity"="marketplace"](around:${radius},${lat},${lon});
          // Transport
          node["public_transport"](around:${radius},${lat},${lon});
          node["railway"="station"](around:${radius},${lat},${lon});
          node["railway"="tram_stop"](around:${radius},${lat},${lon});
          node["amenity"="bus_station"](around:${radius},${lat},${lon});
          // Santé
          node["amenity"="pharmacy"](around:${radius},${lat},${lon});
          node["amenity"="doctors"](around:${radius},${lat},${lon});
          node["amenity"="hospital"](around:${radius},${lat},${lon});
          node["amenity"="clinic"](around:${radius},${lat},${lon});
          // Loisirs
          node["leisure"="park"](around:${radius},${lat},${lon});
          way["leisure"="park"](around:${radius},${lat},${lon});
          node["amenity"="restaurant"](around:${radius},${lat},${lon});
          node["amenity"="cafe"](around:${radius},${lat},${lon});
          node["amenity"="cinema"](around:${radius},${lat},${lon});
          node["leisure"="sports_centre"](around:${radius},${lat},${lon});
          // Services
          node["amenity"="bank"](around:${radius},${lat},${lon});
          node["amenity"="post_office"](around:${radius},${lat},${lon});
          node["amenity"="police"](around:${radius},${lat},${lon});
        );
        out body;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const amenities: NeighborhoodData['amenities'] = {
        education: { name: 'Éducation', icon: '🎓', count: 0, items: [] },
        commerce: { name: 'Commerces', icon: '🛒', count: 0, items: [] },
        transport: { name: 'Transports', icon: '🚇', count: 0, items: [] },
        sante: { name: 'Santé', icon: '🏥', count: 0, items: [] },
        loisirs: { name: 'Loisirs', icon: '🌳', count: 0, items: [] },
        services: { name: 'Services', icon: '🏛️', count: 0, items: [] },
      };

      let greenSpacesCount = 0;
      let nearestGreenSpace = Infinity;

      if (response.ok) {
        const data = await response.json();

        data.elements?.forEach((el: any) => {
          const tags = el.tags || {};
          const elLat = el.lat || el.center?.lat;
          const elLon = el.lon || el.center?.lon;
          
          if (!elLat || !elLon) return;

          const distance = calculateDistance(lat, lon, elLat, elLon);
          const poi: POI = {
            id: String(el.id),
            name: tags.name || tags.amenity || tags.shop || 'Sans nom',
            type: tags.amenity || tags.shop || tags.leisure || tags.public_transport || 'autre',
            category: '',
            distance,
            lat: elLat,
            lon: elLon,
          };

          // Categorize
          if (['school', 'kindergarten', 'college', 'university'].includes(tags.amenity)) {
            poi.category = 'education';
            amenities.education.items.push(poi);
            amenities.education.count++;
          } else if (tags.shop || tags.amenity === 'marketplace') {
            poi.category = 'commerce';
            amenities.commerce.items.push(poi);
            amenities.commerce.count++;
          } else if (tags.public_transport || tags.railway || tags.amenity === 'bus_station') {
            poi.category = 'transport';
            amenities.transport.items.push(poi);
            amenities.transport.count++;
          } else if (['pharmacy', 'doctors', 'hospital', 'clinic'].includes(tags.amenity)) {
            poi.category = 'sante';
            amenities.sante.items.push(poi);
            amenities.sante.count++;
          } else if (tags.leisure === 'park') {
            poi.category = 'loisirs';
            amenities.loisirs.items.push(poi);
            amenities.loisirs.count++;
            greenSpacesCount++;
            if (distance < nearestGreenSpace) nearestGreenSpace = distance;
          } else if (['restaurant', 'cafe', 'cinema'].includes(tags.amenity) || tags.leisure === 'sports_centre') {
            poi.category = 'loisirs';
            amenities.loisirs.items.push(poi);
            amenities.loisirs.count++;
          } else if (['bank', 'post_office', 'police'].includes(tags.amenity)) {
            poi.category = 'services';
            amenities.services.items.push(poi);
            amenities.services.count++;
          }
        });

        // Sort items by distance
        Object.values(amenities).forEach(cat => {
          cat.items.sort((a, b) => a.distance - b.distance);
          cat.items = cat.items.slice(0, 5); // Top 5
        });
      }

      // Calculate walk score (simplified)
      const totalAmenities = Object.values(amenities).reduce((sum, cat) => sum + cat.count, 0);
      const walkScore = Math.min(100, Math.round(
        (totalAmenities / 50) * 100 * 
        (amenities.transport.count > 0 ? 1.2 : 0.8) *
        (amenities.commerce.count > 5 ? 1.1 : 1)
      ));

      // Try to get air quality from Open-Meteo
      let airQuality: NeighborhoodData['airQuality'];
      try {
        const aqResponse = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,european_aqi`
        );
        if (aqResponse.ok) {
          const aqData = await aqResponse.json();
          const aqi = aqData.current?.european_aqi || 50;
          airQuality = {
            aqi,
            level: aqi <= 50 ? 'Bon' : aqi <= 100 ? 'Modéré' : aqi <= 150 ? 'Mauvais' : 'Très mauvais',
            pm25: aqData.current?.pm2_5,
            pm10: aqData.current?.pm10,
          };
        }
      } catch {
        // Air quality not critical
      }

      setNeighborhoodData({
        amenities,
        walkScore,
        airQuality,
        greenSpaces: {
          count: greenSpacesCount,
          nearestDistance: nearestGreenSpace === Infinity ? 0 : nearestGreenSpace,
        },
        lastUpdate: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Neighborhood fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setNeighborhoodData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    neighborhoodData,
    isLoading,
    error,
    fetchNeighborhoodData,
  };
};
