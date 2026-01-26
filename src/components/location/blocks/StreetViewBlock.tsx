import { Camera, ExternalLink, Image, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { SmartBlock, StatusBadge } from './SmartBlock';
import { StreetImageryResponse } from '@/hooks/useStreetImagery';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StreetViewBlockProps {
  latitude: number;
  longitude: number;
  streetImageryData?: StreetImageryResponse | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const StreetViewBlock = ({
  latitude,
  longitude,
  streetImageryData,
  isLoading,
  onRefresh,
}: StreetViewBlockProps) => {
  const hasImages = streetImageryData?.images && streetImageryData.images.length > 0;
  const closestImage = streetImageryData?.closestImage;

  const openViewer = () => {
    const url = streetImageryData?.viewerUrl || 
      `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const openGoogleStreetView = () => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const getSourceBadgeColor = (source: string) => {
    if (source.includes('Panoramax')) return 'bg-blue-500/10 text-blue-600 border-blue-200';
    if (source.includes('Mapillary')) return 'bg-green-500/10 text-green-600 border-green-200';
    if (source.includes('KartaView')) return 'bg-orange-500/10 text-orange-600 border-orange-200';
    if (source.includes('Wikimedia')) return 'bg-purple-500/10 text-purple-600 border-purple-200';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <SmartBlock
      icon={<Camera className="h-5 w-5" />}
      title="Vue rue / Street-Level"
      subtitle="Photos panoramiques de la rue"
      isLoading={isLoading}
      badge={hasImages ? <StatusBadge status="success" label={`${streetImageryData?.images.length} photo(s)`} /> : undefined}
      headerAction={
        onRefresh && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {/* Source badge with AI fallback indicator */}
        {streetImageryData?.source && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${getSourceBadgeColor(streetImageryData.source)}`}>
              {streetImageryData.fallbackUsed ? (
                <Sparkles className="h-3 w-3 mr-1" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              {streetImageryData.source}
            </Badge>
            {streetImageryData.fallbackUsed && (
              <span className="text-xs text-muted-foreground">
                Source alternative auto-détectée
              </span>
            )}
          </div>
        )}

        {/* Preview image */}
        {closestImage?.thumbnailUrl || closestImage?.fullUrl ? (
          <div className="relative rounded-xl overflow-hidden aspect-video bg-muted">
            <img
              src={closestImage.fullUrl || closestImage.thumbnailUrl}
              alt="Street view"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
              <p className="text-xs text-white">
                📷 {closestImage.capturedAt 
                  ? new Date(closestImage.capturedAt).toLocaleDateString('fr-FR')
                  : 'Date inconnue'
                }
              </p>
            </div>
            <button
              onClick={openViewer}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
            >
              <div className="bg-white/90 backdrop-blur rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-5 w-5 text-foreground" />
              </div>
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/50 aspect-video flex flex-col items-center justify-center">
            <Image className="h-12 w-12 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Recherche d'images en cours...</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Panoramax → KartaView → Wikimedia
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={openViewer}
          >
            <Camera className="h-4 w-4" />
            {streetImageryData?.source?.includes('Panoramax') ? 'Panoramax' : 
             streetImageryData?.source?.includes('Mapillary') ? 'Mapillary' : 'Voir'}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={openGoogleStreetView}
          >
            <ExternalLink className="h-4 w-4" />
            Google Street View
          </Button>
        </div>

        {/* Image thumbnails if available */}
        {hasImages && streetImageryData.images.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Autres prises de vue ({streetImageryData.images.length - 1})
            </p>
            <div className="grid grid-cols-4 gap-2">
              {streetImageryData.images.slice(1, 5).map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => {
                    if (img.source === 'mapillary') {
                      window.open(`https://www.mapillary.com/app/?pKey=${img.id}&focus=photo`, '_blank');
                    } else if (img.source === 'panoramax') {
                      window.open(`https://panoramax.fr/#focus=pic&pic=${img.id}`, '_blank');
                    } else if (img.fullUrl) {
                      window.open(img.fullUrl, '_blank');
                    }
                  }}
                  className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                >
                  {img.thumbnailUrl || img.fullUrl ? (
                    <img
                      src={img.thumbnailUrl || img.fullUrl}
                      alt={`Street view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </SmartBlock>
  );
};
