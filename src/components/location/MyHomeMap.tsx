import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Map, Satellite, Layers, Loader2, Navigation, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type MapType = 'plan' | 'satellite' | 'hybrid';

interface MyHomeMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  zoom?: number;
  height?: string;
  showControls?: boolean;
  className?: string;
  compact?: boolean;
}

export const MyHomeMap = ({
  latitude,
  longitude,
  address,
  zoom = 17,
  height = '300px',
  showControls = true,
  className = '',
  compact = false,
}: MyHomeMapProps) => {
  const [mapType, setMapType] = useState<MapType>('satellite');
  const [isLoaded, setIsLoaded] = useState(false);

  const getMapUrl = () => {
    const bbox = {
      minLon: longitude - 0.002,
      maxLon: longitude + 0.002,
      minLat: latitude - 0.0015,
      maxLat: latitude + 0.0015,
    };

    if (mapType === 'satellite' || mapType === 'hybrid') {
      return `https://www.arcgis.com/apps/mapviewer/index.html?center=${longitude},${latitude}&level=${zoom}&basemap=satellite`;
    }

    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&layer=mapnik&marker=${latitude},${longitude}`;
  };

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
  };

  return (
    <div 
      className={cn(
        "relative rounded-2xl overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-lg",
        className
      )} 
      style={{ height }}
    >
      {/* MyHome Branding Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-background/95 via-background/80 to-transparent p-3 pb-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <Navigation className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">MyHome Map</h3>
            <p className="text-[10px] text-muted-foreground">Vue satellite enrichie</p>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-muted z-10 gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Chargement de la carte...</p>
        </div>
      )}

      {/* Map iframe */}
      <iframe
        src={getMapUrl()}
        className="w-full h-full border-0"
        title="MyHome Map"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        style={{ opacity: isLoaded ? 1 : 0 }}
      />

      {/* Address label */}
      {address && !compact && (
        <div className="absolute bottom-16 left-3 z-20 bg-background/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-border/50 max-w-[70%]">
          <p className="text-xs font-semibold text-foreground truncate">{address}</p>
          <p className="text-[10px] text-muted-foreground">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        </div>
      )}

      {/* Map type switcher */}
      {showControls && (
        <div className="absolute top-14 right-3 z-20 flex flex-col gap-1 bg-background/95 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-border">
          <Button
            variant={mapType === 'plan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMapType('plan'); setIsLoaded(false); }}
            className={cn(
              "h-9 w-9 p-0",
              mapType === 'plan' && "bg-primary text-primary-foreground shadow-md"
            )}
            title="Plan"
          >
            <Map className="h-4 w-4" />
          </Button>
          <Button
            variant={mapType === 'satellite' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMapType('satellite'); setIsLoaded(false); }}
            className={cn(
              "h-9 w-9 p-0",
              mapType === 'satellite' && "bg-primary text-primary-foreground shadow-md"
            )}
            title="Satellite"
          >
            <Satellite className="h-4 w-4" />
          </Button>
          <Button
            variant={mapType === 'hybrid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMapType('hybrid'); setIsLoaded(false); }}
            className={cn(
              "h-9 w-9 p-0",
              mapType === 'hybrid' && "bg-primary text-primary-foreground shadow-md"
            )}
            title="Hybride"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-3 right-3 z-20 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={openInGoogleMaps}
          className="h-9 bg-background/95 backdrop-blur-md shadow-lg border border-border hover:bg-background"
        >
          <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs font-medium">Ouvrir</span>
        </Button>
      </div>

      {/* Bottom gradient for polish */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/50 to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default MyHomeMap;
