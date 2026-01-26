import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Map, Satellite, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type MapType = 'plan' | 'satellite' | 'hybrid';

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  zoom?: number;
  height?: string;
  showControls?: boolean;
  className?: string;
}

export const PropertyMap = ({
  latitude,
  longitude,
  address,
  zoom = 17,
  height = '300px',
  showControls = true,
  className = '',
}: PropertyMapProps) => {
  const [mapType, setMapType] = useState<MapType>('plan');
  const [isLoaded, setIsLoaded] = useState(false);

  // Build the map URL based on type
  const getMapUrl = () => {
    const bbox = {
      minLon: longitude - 0.003,
      maxLon: longitude + 0.003,
      minLat: latitude - 0.002,
      maxLat: latitude + 0.002,
    };

    if (mapType === 'satellite' || mapType === 'hybrid') {
      // Use Esri satellite tiles via iframe
      return `https://www.arcgis.com/apps/mapviewer/index.html?center=${longitude},${latitude}&level=${zoom}&basemap=satellite`;
    }

    // OpenStreetMap embed
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&layer=mapnik&marker=${latitude},${longitude}`;
  };

  return (
    <div 
      className={cn(
        "relative rounded-xl overflow-hidden border border-border bg-muted",
        className
      )} 
      style={{ height }}
    >
      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Map iframe */}
      <iframe
        src={getMapUrl()}
        className="w-full h-full border-0"
        title="Carte du bien"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        style={{ opacity: isLoaded ? 1 : 0 }}
      />

      {/* Address label */}
      {address && (
        <div className="absolute top-3 left-3 z-20 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-border/50 max-w-[60%]">
          <p className="text-xs font-medium truncate">{address}</p>
        </div>
      )}

      {/* Map type switcher */}
      {showControls && (
        <div className="absolute top-3 right-3 z-20 flex gap-1 bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border">
          <Button
            variant={mapType === 'plan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMapType('plan'); setIsLoaded(false); }}
            className="h-8 px-2"
            title="Plan"
          >
            <Map className="h-4 w-4" />
          </Button>
          <Button
            variant={mapType === 'satellite' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMapType('satellite'); setIsLoaded(false); }}
            className="h-8 px-2"
            title="Satellite"
          >
            <Satellite className="h-4 w-4" />
          </Button>
          <Button
            variant={mapType === 'hybrid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMapType('hybrid'); setIsLoaded(false); }}
            className="h-8 px-2"
            title="Hybride"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Link to open full map */}
      <a
        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 z-20 bg-background/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors shadow-sm border border-border/50"
      >
        Ouvrir dans Maps ↗
      </a>
    </div>
  );
};
