import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, Maximize2, Building2, MapPin, Compass,
  Home, Ruler, Calendar, Users, Map, Satellite, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon for the property
const propertyIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type MapType = 'plan' | 'satellite' | 'hybrid';

interface PropertyInfo {
  type?: string;
  surface?: number;
  rooms?: number;
  floors?: number;
  yearBuilt?: number;
  parcelNumber?: string;
  ownerType?: string;
}

interface MyHomeMapInteractiveProps {
  latitude: number;
  longitude: number;
  address?: string;
  zoom?: number;
  height?: string;
  showControls?: boolean;
  className?: string;
  propertyInfo?: PropertyInfo;
  onBuildingClick?: () => void;
}

// Component to change map view
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Component to handle map type change
function MapTypeLayer({ mapType }: { mapType: MapType }) {
  const getTileUrl = () => {
    switch (mapType) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'hybrid':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getAttribution = () => {
    switch (mapType) {
      case 'satellite':
      case 'hybrid':
        return '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  return (
    <>
      <TileLayer
        url={getTileUrl()}
        attribution={getAttribution()}
      />
      {mapType === 'hybrid' && (
        <TileLayer
          url="https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://stamen.com">Stamen Design</a>'
        />
      )}
    </>
  );
}

export const MyHomeMapInteractive = ({
  latitude,
  longitude,
  address,
  zoom = 18,
  height = '400px',
  showControls = true,
  className = '',
  propertyInfo,
  onBuildingClick,
}: MyHomeMapInteractiveProps) => {
  const [mapType, setMapType] = useState<MapType>('satellite');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
  };

  const handleMarkerClick = () => {
    setIsPopupOpen(true);
    onBuildingClick?.();
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
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-gradient-to-b from-background/98 via-background/90 to-transparent p-3 pb-10 pointer-events-none">
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ring-2 ring-primary/20">
            <Navigation className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              MyHome Map
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                Interactive
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">Cliquez sur le marqueur pour les infos</p>
          </div>
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <ChangeView center={[latitude, longitude]} zoom={zoom} />
        <MapTypeLayer mapType={mapType} />
        
        <Marker 
          position={[latitude, longitude]} 
          icon={propertyIcon}
          ref={markerRef}
          eventHandlers={{
            click: handleMarkerClick
          }}
        >
          <Popup className="myhome-popup" maxWidth={320} minWidth={280}>
            <div className="p-1">
              {/* Popup Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground truncate">
                    {propertyInfo?.type || 'Bien immobilier'}
                  </h4>
                  {address && (
                    <p className="text-xs text-muted-foreground truncate">{address}</p>
                  )}
                </div>
              </div>

              {/* Property Info Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {propertyInfo?.surface && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Ruler className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Surface</p>
                      <p className="text-xs font-medium">{propertyInfo.surface} m²</p>
                    </div>
                  </div>
                )}
                {propertyInfo?.rooms && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Home className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Pièces</p>
                      <p className="text-xs font-medium">{propertyInfo.rooms}</p>
                    </div>
                  </div>
                )}
                {propertyInfo?.floors && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Étages</p>
                      <p className="text-xs font-medium">{propertyInfo.floors}</p>
                    </div>
                  </div>
                )}
                {propertyInfo?.yearBuilt && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Année</p>
                      <p className="text-xs font-medium">{propertyInfo.yearBuilt}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {(propertyInfo?.parcelNumber || propertyInfo?.ownerType) && (
                <div className="space-y-1.5 mb-3 p-2 bg-primary/5 rounded-lg">
                  {propertyInfo.parcelNumber && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Parcelle</span>
                      <span className="font-medium">{propertyInfo.parcelNumber}</span>
                    </div>
                  )}
                  {propertyInfo.ownerType && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Type propriétaire</span>
                      <span className="font-medium">{propertyInfo.ownerType}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Coordinates */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Compass className="h-3 w-3" />
                <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Address label */}
      {address && (
        <div className="absolute bottom-16 left-3 z-[1000] bg-background/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-border/50 max-w-[65%]">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs font-semibold text-foreground truncate">{address}</p>
          </div>
        </div>
      )}

      {/* Map type switcher */}
      {showControls && (
        <div className="absolute top-20 right-3 z-[1000] flex flex-col gap-1 bg-background/95 backdrop-blur-md rounded-xl p-1.5 shadow-lg border border-border">
          <Button
            variant={mapType === 'plan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMapType('plan')}
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
            onClick={() => setMapType('satellite')}
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
            onClick={() => setMapType('hybrid')}
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
      <div className="absolute bottom-3 right-3 z-[1000] flex gap-2">
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

      {/* Bottom gradient for polish */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/30 to-transparent pointer-events-none z-[999]" />
    </div>
  );
};

export default MyHomeMapInteractive;
