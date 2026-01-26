import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Map, Satellite, Layers, Loader2, Navigation, Maximize2, 
  Eye, RotateCcw, Camera, Building2, Compass
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type MapType = 'plan' | 'satellite' | 'hybrid';
type ViewMode = 'map' | '3d' | 'streetview';

interface MyHomeMapEnrichedProps {
  latitude: number;
  longitude: number;
  address?: string;
  zoom?: number;
  height?: string;
  showControls?: boolean;
  className?: string;
  streetViewImage?: string;
  streetViewSource?: string;
  streetViewDate?: string | number;
  showViewModes?: boolean;
}

export const MyHomeMapEnriched = ({
  latitude,
  longitude,
  address,
  zoom = 18,
  height = '400px',
  showControls = true,
  className = '',
  streetViewImage,
  streetViewSource,
  streetViewDate,
  showViewModes = true,
}: MyHomeMapEnrichedProps) => {
  const [mapType, setMapType] = useState<MapType>('satellite');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [isLoaded, setIsLoaded] = useState(false);
  const [is3DLoaded, setIs3DLoaded] = useState(false);

  const getMapUrl = useCallback(() => {
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
  }, [latitude, longitude, zoom, mapType]);

  const get3DUrl = useCallback(() => {
    // Google Earth Web 3D view
    return `https://earth.google.com/web/@${latitude},${longitude},100a,200d,35y,0h,45t,0r`;
  }, [latitude, longitude]);

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
  };

  const openIn3D = () => {
    window.open(get3DUrl(), '_blank');
  };

  const openStreetView = () => {
    window.open(`https://www.google.com/maps/@${latitude},${longitude},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`, '_blank');
  };

  return (
    <div 
      className={cn(
        "relative rounded-2xl overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-xl",
        className
      )} 
      style={{ height }}
    >
      {/* MyHome Branding Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-background/98 via-background/90 to-transparent p-3 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-2 ring-primary/20">
              <Navigation className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                MyHome Map
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                  360°
                </Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">Vue enrichie du bien immobilier</p>
            </div>
          </div>
          
          {/* View Mode Tabs */}
          {showViewModes && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
              <TabsList className="h-8 bg-background/80 backdrop-blur-md border shadow-sm">
                <TabsTrigger value="map" className="h-6 px-2 text-xs gap-1">
                  <Map className="h-3 w-3" />
                  Carte
                </TabsTrigger>
                <TabsTrigger value="3d" className="h-6 px-2 text-xs gap-1">
                  <Building2 className="h-3 w-3" />
                  3D
                </TabsTrigger>
                <TabsTrigger value="streetview" className="h-6 px-2 text-xs gap-1">
                  <Camera className="h-3 w-3" />
                  Rue
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      {/* Loading state */}
      {!isLoaded && viewMode === 'map' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-muted z-10 gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Chargement de la carte...</p>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <iframe
          src={getMapUrl()}
          className="w-full h-full border-0"
          title="MyHome Map"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}

      {/* 3D View */}
      {viewMode === '3d' && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {!is3DLoaded ? (
            <div className="text-center space-y-4">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mx-auto animate-pulse">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">Vue 3D du bâtiment</h4>
                <p className="text-sm text-slate-400 mb-4">Explorez le bien en trois dimensions</p>
              </div>
              <Button 
                onClick={() => {
                  setIs3DLoaded(true);
                  openIn3D();
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ouvrir Google Earth 3D
              </Button>
              <p className="text-xs text-slate-500 mt-2">S'ouvre dans un nouvel onglet</p>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto">
                <Building2 className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-sm text-slate-300">Vue 3D ouverte dans un nouvel onglet</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={openIn3D}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Rouvrir
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Street View */}
      {viewMode === 'streetview' && (
        <div className="w-full h-full">
          {streetViewImage ? (
            <div className="relative w-full h-full">
              <img 
                src={streetViewImage} 
                alt="Street View" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {streetViewSource && (
                      <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                        {streetViewSource}
                      </Badge>
                    )}
                    {streetViewDate && (
                      <span className="text-xs text-white/80">
                        {new Date(typeof streetViewDate === 'number' ? streetViewDate : streetViewDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={openStreetView}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                    Google Street View
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/50 via-slate-800 to-slate-900">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-500/30 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Camera className="h-10 w-10 text-purple-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-1">Vue de la rue</h4>
              <p className="text-sm text-slate-400 mb-4">Explorez les alentours du bien</p>
              <Button 
                onClick={openStreetView}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ouvrir Street View
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Address label - only on map view */}
      {address && viewMode === 'map' && (
        <div className="absolute bottom-16 left-3 z-20 bg-background/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-border/50 max-w-[65%]">
          <p className="text-xs font-semibold text-foreground truncate">{address}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Compass className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          </div>
        </div>
      )}

      {/* Map type switcher - only on map view */}
      {showControls && viewMode === 'map' && (
        <div className="absolute top-20 right-3 z-20 flex flex-col gap-1 bg-background/95 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-border">
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
      {viewMode === 'map' && (
        <div className="absolute bottom-3 right-3 z-20 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={openInGoogleMaps}
            className="h-9 bg-background/95 backdrop-blur-md shadow-lg border border-border hover:bg-background"
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs font-medium">Ouvrir Maps</span>
          </Button>
        </div>
      )}

      {/* Bottom gradient for polish */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/30 to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default MyHomeMapEnriched;
