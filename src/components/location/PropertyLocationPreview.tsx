import { useEffect, useState } from 'react';
import { MapPin, Navigation, Mountain, Building2, AlertTriangle, Loader2, ChevronRight, Eye } from 'lucide-react';
import { useGeoData } from '@/hooks/useGeoData';
import { useCadastralData } from '@/hooks/useCadastralData';
import { useGeorisques } from '@/hooks/useGeorisques';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PropertyLocationSection } from './PropertyLocationSection';

interface PropertyLocationPreviewProps {
  latitude?: number;
  longitude?: number;
  codeInsee?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  className?: string;
}

export const PropertyLocationPreview = ({
  latitude,
  longitude,
  codeInsee,
  address,
  postalCode,
  city,
  className,
}: PropertyLocationPreviewProps) => {
  const { geoData, isLoading: geoLoading, fetchGeoData } = useGeoData();
  const { cadastralData, isLoading: cadastreLoading, fetchCadastralData } = useCadastralData();
  const { riskData, isLoading: risksLoading, fetchRiskData, getRiskLevel } = useGeorisques();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (latitude && longitude) {
      fetchGeoData(latitude, longitude, codeInsee);
      fetchCadastralData(latitude, longitude);
      fetchRiskData(latitude, longitude, codeInsee);
    }
  }, [latitude, longitude, codeInsee]);

  if (!latitude || !longitude) {
    return null;
  }

  const isLoading = geoLoading || cadastreLoading || risksLoading;
  const riskLevel = riskData?.risks ? getRiskLevel(riskData.risks) : null;

  // Use OpenStreetMap tiles via a more reliable static map service
  const zoom = 16;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.002},${latitude - 0.001},${longitude + 0.002},${latitude + 0.001}&layer=mapnik&marker=${latitude},${longitude}`;

  const displayAddress = address || [postalCode, city].filter(Boolean).join(' ');

  return (
    <div className={cn("bg-card rounded-2xl border border-border/50 overflow-hidden", className)}>
      {/* Mini Map with iframe for reliability */}
      <div className="relative h-36 bg-muted">
        <iframe
          src={mapUrl}
          className="w-full h-full border-0"
          title="Carte du bien"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 bg-background/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="truncate max-w-[180px]">{displayAddress || 'Position'}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
            <span className="text-xs text-muted-foreground">Chargement des données...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* GPS */}
            <div className="bg-muted/50 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Navigation className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wider font-medium">GPS</span>
              </div>
              <p className="text-xs font-semibold truncate">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            </div>

            {/* Altitude */}
            <div className="bg-muted/50 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Mountain className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Altitude</span>
              </div>
              <p className="text-xs font-semibold">
                {geoData?.altitude ? `${geoData.altitude} m` : '-'}
              </p>
            </div>

            {/* INSEE */}
            <div className="bg-muted/50 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Building2 className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wider font-medium">INSEE</span>
              </div>
              <p className="text-xs font-semibold">
                {geoData?.codeInsee || codeInsee || '-'}
              </p>
            </div>

            {/* Risks */}
            <div className="bg-muted/50 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Risques</span>
              </div>
              <p className={cn(
                "text-xs font-semibold",
                riskLevel === 'high' && "text-red-500",
                riskLevel === 'medium' && "text-amber-500",
                riskLevel === 'low' && "text-emerald-500"
              )}>
                {riskLevel === 'high' && 'Élevé'}
                {riskLevel === 'medium' && 'Modéré'}
                {riskLevel === 'low' && 'Faible'}
                {!riskLevel && '-'}
              </p>
            </div>
          </div>
        )}

        {/* Cadastre summary */}
        {cadastralData?.parcels && cadastralData.parcels.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground">
              📑 Parcelle: {cadastralData.parcels[0].section}-{cadastralData.parcels[0].numero}
              {cadastralData.parcels[0].contenance > 0 && (
                <span> • {cadastralData.parcels[0].contenance} m²</span>
              )}
            </p>
          </div>
        )}

        {/* Full details button */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full mt-3 gap-2 text-xs h-9"
            >
              <Eye className="h-3.5 w-3.5" />
              Voir tous les détails
              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] p-0">
            <SheetHeader className="px-4 pt-4 pb-2 border-b">
              <SheetTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Informations complètes du bien
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(90vh-60px)]">
              <div className="p-4">
                <PropertyLocationSection
                  latitude={latitude}
                  longitude={longitude}
                  address={address}
                  postalCode={postalCode}
                  city={city}
                  codeInsee={codeInsee}
                />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};