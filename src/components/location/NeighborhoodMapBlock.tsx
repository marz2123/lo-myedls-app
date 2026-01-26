import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNeighborhoodData, POI } from '@/hooks/useNeighborhoodData';

interface NeighborhoodMapBlockProps {
  latitude: number;
  longitude: number;
  address?: string;
  smartFillerData?: any; // Data from smart-data-filler as fallback
}

// Category configuration with colors matching reference
const CATEGORY_CONFIG = {
  transport: { 
    label: 'Transports', 
    color: '#3B82F6', // blue
    bgColor: 'bg-blue-500',
    description: 'Au niveau des transports'
  },
  commerce: { 
    label: 'Commerces', 
    color: '#F59E0B', // amber
    bgColor: 'bg-amber-500',
    description: 'Pour faire les courses'
  },
  loisirs: { 
    label: 'Loisirs', 
    color: '#EC4899', // pink
    bgColor: 'bg-pink-500',
    description: 'Si on sortait ?'
  },
  education: { 
    label: 'Éducation', 
    color: '#6366F1', // indigo
    bgColor: 'bg-indigo-500',
    description: "Et pour y aller à l'école"
  },
  sante: { 
    label: 'Santé', 
    color: '#10B981', // emerald
    bgColor: 'bg-emerald-500',
    description: 'Restez en bonne santé'
  },
  services: { 
    label: 'Services publics', 
    color: '#1D4ED8', // blue-700
    bgColor: 'bg-blue-700',
    description: 'Services publics'
  },
};

export const NeighborhoodMapBlock: React.FC<NeighborhoodMapBlockProps> = ({
  latitude,
  longitude,
  address,
  smartFillerData,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { neighborhoodData: fetchedData, isLoading, fetchNeighborhoodData } = useNeighborhoodData();

  useEffect(() => {
    if (latitude && longitude) {
      fetchNeighborhoodData(latitude, longitude);
    }
  }, [latitude, longitude, fetchNeighborhoodData]);

  // Merge fetched data with smart filler data
  const neighborhoodData = React.useMemo(() => {
    // If we have fetched data with POIs, use it
    if (fetchedData?.amenities) {
      const totalFetched = Object.values(fetchedData.amenities).reduce((sum, cat) => sum + cat.count, 0);
      if (totalFetched > 0) return fetchedData;
    }

    // If smart filler provided neighborhood data, convert it to the expected format
    if (smartFillerData?.neighborhood?.data) {
      const sfData = smartFillerData.neighborhood.data;
      console.log('🔄 Using smart filler neighborhood data:', sfData);
      
      // Convert smart filler format to useNeighborhoodData format
      const convertPOIs = (items: any[] = [], categoryName: string) => items.map((el: any, idx: number) => ({
        id: String(el.id || idx),
        name: el.tags?.name || el.tags?.amenity || el.tags?.shop || 'Sans nom',
        type: el.tags?.amenity || el.tags?.shop || el.tags?.leisure || 'autre',
        category: categoryName,
        distance: 0, // Would need to calculate
        lat: el.lat,
        lon: el.lon,
      }));

      return {
        amenities: {
          transport: { name: 'Transports', icon: '🚇', count: sfData.transport?.length || 0, items: convertPOIs(sfData.transport, 'transport') },
          commerce: { name: 'Commerces', icon: '🛒', count: sfData.shops?.length || 0, items: convertPOIs(sfData.shops, 'commerce') },
          loisirs: { name: 'Loisirs', icon: '🌳', count: sfData.leisure?.length || 0, items: convertPOIs(sfData.leisure, 'loisirs') },
          education: { name: 'Éducation', icon: '🎓', count: sfData.education?.length || 0, items: convertPOIs(sfData.education, 'education') },
          sante: { name: 'Santé', icon: '🏥', count: sfData.health?.length || 0, items: convertPOIs(sfData.health, 'sante') },
          services: { name: 'Services', icon: '🏛️', count: sfData.services?.length || 0, items: convertPOIs(sfData.services, 'services') },
        },
        walkScore: 0,
        airQuality: undefined,
        greenSpaces: { count: 0, nearestDistance: 0 },
        lastUpdate: smartFillerData.neighborhood.fetchedAt || new Date().toISOString(),
      } as import('@/hooks/useNeighborhoodData').NeighborhoodData;
    }

    return fetchedData;
  }, [fetchedData, smartFillerData]);

  // Generate map background URL (OpenStreetMap tiles)
  const getMapBackgroundUrl = () => {
    // Using OpenStreetMap static image via Geoapify or similar free service
    const zoom = 15;
    const width = 600;
    const height = 400;
    // Free static map from OpenStreetMap via Thunderforest alternative or standard tiles
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.008},${latitude - 0.005},${longitude + 0.008},${latitude + 0.005}&layer=mapnik&marker=${latitude},${longitude}`;
  };

  // Generate SVG map with POIs (overlay on top of map)
  const generateMapSVG = () => {
    if (!neighborhoodData) return null;

    const allPOIs: (POI & { categoryKey: string })[] = [];
    Object.entries(neighborhoodData.amenities).forEach(([key, category]) => {
      category.items.forEach(poi => {
        allPOIs.push({ ...poi, categoryKey: key });
      });
    });

    // Calculate bounds
    const lats = [latitude, ...allPOIs.map(p => p.lat)];
    const lons = [longitude, ...allPOIs.map(p => p.lon)];
    const minLat = Math.min(...lats) - 0.002;
    const maxLat = Math.max(...lats) + 0.002;
    const minLon = Math.min(...lons) - 0.003;
    const maxLon = Math.max(...lons) + 0.003;

    const width = 600;
    const height = 400;

    const toX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * width;
    const toY = (lat: number) => height - ((lat - minLat) / (maxLat - minLat)) * height;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full absolute inset-0 z-10">
        {/* POI dots */}
        {allPOIs.map((poi, index) => {
          const config = CATEGORY_CONFIG[poi.categoryKey as keyof typeof CATEGORY_CONFIG];
          return (
            <g key={poi.id || index}>
              {/* Shadow */}
              <circle
                cx={toX(poi.lon)}
                cy={toY(poi.lat) + 2}
                r="10"
                fill="rgba(0,0,0,0.3)"
              />
              {/* Main dot */}
              <circle
                cx={toX(poi.lon)}
                cy={toY(poi.lat)}
                r="10"
                fill={config?.color || '#888'}
                stroke="white"
                strokeWidth="2"
                className="transition-all hover:r-12"
              >
                <title>{`${poi.name} (${poi.distance}m)`}</title>
              </circle>
            </g>
          );
        })}

        {/* Center marker (property location) */}
        <g transform={`translate(${toX(longitude)}, ${toY(latitude)})`}>
          <circle r="22" fill="rgba(0,0,0,0.3)" cy="3" />
          <circle r="20" fill="white" />
          <circle r="16" fill="#3B82F6" />
          <circle r="6" fill="white" />
        </g>
      </svg>
    );
  };

  // Get nearest POI for each category
  const getNearest = (categoryKey: string) => {
    if (!neighborhoodData) return null;
    const category = neighborhoodData.amenities[categoryKey as keyof typeof neighborhoodData.amenities];
    if (!category || category.items.length === 0) return null;
    return category.items[0]; // Already sorted by distance
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map with real background */}
      <div 
        ref={mapRef}
        className="relative rounded-2xl overflow-hidden border border-border h-[300px]"
      >
        {/* OpenStreetMap background */}
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.008}%2C${latitude - 0.005}%2C${longitude + 0.008}%2C${latitude + 0.005}&layer=mapnik`}
          className="absolute inset-0 w-full h-full border-0"
          style={{ filter: 'saturate(0.8) contrast(1.1)' }}
          loading="lazy"
          title="Carte du quartier"
        />
        
        {/* POI overlay */}
        {neighborhoodData && generateMapSVG()}
        
        {/* Address label */}
        {address && (
          <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-border/50 max-w-[60%] z-20">
            <p className="text-xs font-medium truncate">{address}</p>
          </div>
        )}
        
        {/* Loading overlay */}
        {!neighborhoodData && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Walk Score */}
      {neighborhoodData && (
        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">{neighborhoodData.walkScore}</span>
          </div>
          <div>
            <p className="font-semibold text-foreground">Walk Score</p>
            <p className="text-sm text-muted-foreground">
              {neighborhoodData.walkScore >= 90 ? "Paradis des piétons" :
               neighborhoodData.walkScore >= 70 ? "Très agréable à pied" :
               neighborhoodData.walkScore >= 50 ? "Quelques commodités" :
               "Dépendant de la voiture"}
            </p>
          </div>
        </div>
      )}

      {/* Legend with category cards */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const category = neighborhoodData?.amenities[key as keyof typeof neighborhoodData.amenities];
          const nearest = getNearest(key);
          
          return (
            <div 
              key={key}
              className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border/50"
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0", config.bgColor)}>
                <span className="text-lg">
                  {key === 'transport' && '🚌'}
                  {key === 'commerce' && '🛒'}
                  {key === 'loisirs' && '🎭'}
                  {key === 'education' && '🎓'}
                  {key === 'sante' && '🏥'}
                  {key === 'services' && '🏛️'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{config.description} ({category?.count || 0}):</p>
                <p className="font-semibold text-sm text-foreground truncate">
                  {config.label}
                  {nearest && (
                    <span className="font-normal text-muted-foreground ml-1">
                      à ({nearest.distance}m)
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Air Quality if available */}
      {neighborhoodData?.airQuality && (
        <div className="p-4 bg-card rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Qualité de l'air</p>
              <p className="font-semibold text-foreground">{neighborhoodData.airQuality.level}</p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              neighborhoodData.airQuality.aqi <= 50 ? "bg-emerald-500/10 text-emerald-600" :
              neighborhoodData.airQuality.aqi <= 100 ? "bg-amber-500/10 text-amber-600" :
              "bg-red-500/10 text-red-600"
            )}>
              AQI: {neighborhoodData.airQuality.aqi}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
