import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Map, Satellite, Layers, MapPin, Navigation, 
  ExternalLink, Loader2, Grid3X3, Mountain, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MapView = 'plan' | 'satellite' | 'cadastre' | 'relief';

interface GeoData {
  altitude?: number;
  codeInsee?: string;
  departement?: string;
  region?: string;
  population?: number;
}

interface UnifiedPropertyMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  postalCode?: string;
  city?: string;
  zoom?: number;
  geoData?: GeoData;
  codeInsee?: string;
  cadastralSection?: string;
  cadastralNumero?: string;
  className?: string;
}

export const UnifiedPropertyMap = ({
  latitude,
  longitude,
  address,
  postalCode,
  city,
  zoom = 17,
  geoData,
  codeInsee,
  cadastralSection,
  cadastralNumero,
  className = '',
}: UnifiedPropertyMapProps) => {
  const [mapView, setMapView] = useState<MapView>('satellite');
  const [isLoaded, setIsLoaded] = useState(false);

  const fullAddress = [address, postalCode, city].filter(Boolean).join(', ');

  const getMapUrl = () => {
    const bbox = {
      minLon: longitude - 0.003,
      maxLon: longitude + 0.003,
      minLat: latitude - 0.002,
      maxLat: latitude + 0.002,
    };

    switch (mapView) {
      case 'satellite':
        return `https://www.arcgis.com/apps/mapviewer/index.html?center=${longitude},${latitude}&level=${zoom}&basemap=satellite`;
      case 'cadastre':
        return `https://cadastre.data.gouv.fr/map#18/${latitude}/${longitude}`;
      case 'relief':
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&layer=cyclemap&marker=${latitude},${longitude}`;
      case 'plan':
      default:
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&layer=mapnik&marker=${latitude},${longitude}`;
    }
  };

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
  };

  const openInGoogleEarth = () => {
    window.open(`https://earth.google.com/web/@${latitude},${longitude},100a,500d,35y,0h,0t,0r`, '_blank');
  };

  const viewConfig = [
    { id: 'plan' as MapView, icon: Map, label: 'Plan' },
    { id: 'satellite' as MapView, icon: Satellite, label: 'Satellite' },
    { id: 'cadastre' as MapView, icon: Grid3X3, label: 'Cadastre' },
    { id: 'relief' as MapView, icon: Mountain, label: 'Relief' },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Premium View Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-muted/50 rounded-2xl border border-border/50">
          {viewConfig.map((view) => (
            <button
              key={view.id}
              onClick={() => { setMapView(view.id); setIsLoaded(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                mapView === view.id 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <view.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-muted" style={{ height: '380px' }}>
        {/* Loading state */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Chargement de la vue {viewConfig.find(v => v.id === mapView)?.label}...</span>
            </div>
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

        {/* Floating Address Label */}
        {fullAddress && (
          <div className="absolute top-3 left-3 z-20 bg-background/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-border/50 max-w-[70%]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm font-medium truncate">{fullAddress}</p>
            </div>
          </div>
        )}

        {/* View Type Badge */}
        <div className="absolute top-3 right-3 z-20">
          <Badge variant="secondary" className="bg-background/95 backdrop-blur-md shadow-lg text-xs">
            {viewConfig.find(v => v.id === mapView)?.label}
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
          {/* Coordinates */}
          <div className="bg-background/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-border/50">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                <Navigation className="w-3 h-3 inline mr-1" />
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
              {geoData?.altitude && (
                <span className="text-muted-foreground border-l border-border pl-3">
                  <Mountain className="w-3 h-3 inline mr-1" />
                  {geoData.altitude}m
                </span>
              )}
            </div>
          </div>

          {/* External Links */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={openInGoogleMaps}
              className="h-8 px-2 bg-background/95 backdrop-blur-md shadow-lg"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              <span className="text-xs">Maps</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={openInGoogleEarth}
              className="h-8 px-2 bg-background/95 backdrop-blur-md shadow-lg"
            >
              <Satellite className="w-3.5 h-3.5 mr-1" />
              <span className="text-xs">3D</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Location Details Grid */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard 
          icon={<MapPin className="w-4 h-4" />}
          label="Code INSEE"
          value={geoData?.codeInsee || codeInsee || '—'}
        />
        <InfoCard 
          icon={<Building2 className="w-4 h-4" />}
          label="Département"
          value={geoData?.departement || '—'}
        />
        <InfoCard 
          icon={<Map className="w-4 h-4" />}
          label="Région"
          value={geoData?.region || '—'}
        />
        <InfoCard 
          icon={<Navigation className="w-4 h-4" />}
          label="Population"
          value={geoData?.population?.toLocaleString('fr-FR') || '—'}
        />
        {(cadastralSection || cadastralNumero) && (
          <>
            <InfoCard 
              icon={<Grid3X3 className="w-4 h-4" />}
              label="Section"
              value={cadastralSection || '—'}
            />
            <InfoCard 
              icon={<Grid3X3 className="w-4 h-4" />}
              label="Parcelle"
              value={cadastralNumero || '—'}
            />
          </>
        )}
      </div>
    </div>
  );
};

const InfoCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  </div>
);
