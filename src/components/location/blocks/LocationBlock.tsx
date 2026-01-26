import { MapPin, Navigation, Mountain, Compass, Globe, Building2, Copy, Check } from 'lucide-react';
import { SmartBlock, InfoRow, InfoGrid } from './SmartBlock';
import { GeoEnrichedData } from '@/hooks/useGeoData';
import { useState } from 'react';
import { toast } from 'sonner';

interface LocationBlockProps {
  latitude?: number;
  longitude?: number;
  geoData?: GeoEnrichedData | null;
  isLoading?: boolean;
  address?: string;
  postalCode?: string;
  city?: string;
}

export const LocationBlock = ({
  latitude,
  longitude,
  geoData,
  isLoading,
  address,
  postalCode,
  city,
}: LocationBlockProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copié');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fullAddress = [address, postalCode, city].filter(Boolean).join(', ');

  return (
    <SmartBlock
      icon={<MapPin className="h-5 w-5" />}
      title="Localisation précise"
      subtitle={fullAddress || 'Adresse non renseignée'}
      isLoading={isLoading}
      defaultOpen={true}
    >
      <div className="space-y-4">
        {/* Address */}
        {fullAddress && (
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Adresse normalisée</p>
                <p className="font-medium">{address}</p>
                <p className="text-sm text-muted-foreground">{postalCode} {city}</p>
              </div>
              <button
                onClick={() => copyToClipboard(fullAddress, 'address')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {copiedField === 'address' ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* GPS Coordinates Grid */}
        {latitude !== undefined && longitude !== undefined && (
          <InfoGrid
            items={[
              { 
                label: 'Latitude', 
                value: latitude.toFixed(6),
                icon: <Navigation className="h-4 w-4" />
              },
              { 
                label: 'Longitude', 
                value: longitude.toFixed(6),
                icon: <Navigation className="h-4 w-4" />
              },
              { 
                label: 'Altitude', 
                value: geoData?.altitude ? `${geoData.altitude} m` : 'N/A',
                icon: <Mountain className="h-4 w-4" />
              },
              { 
                label: 'Orientation', 
                value: geoData?.orientation || 'N/A',
                icon: <Compass className="h-4 w-4" />
              },
            ]}
          />
        )}

        {/* Formatted GPS */}
        {geoData?.gpsFormatted && (
          <div className="space-y-1">
            <InfoRow 
              label="GPS (DMS)" 
              value={geoData.gpsFormatted.dms}
              icon={<Compass className="h-4 w-4" />}
              onCopy={() => copyToClipboard(geoData.gpsFormatted.dms, 'dms')}
            />
            <InfoRow 
              label="GPS (DD)" 
              value={geoData.gpsFormatted.dd}
              icon={<Navigation className="h-4 w-4" />}
              onCopy={() => copyToClipboard(geoData.gpsFormatted.dd, 'dd')}
            />
          </div>
        )}

        {/* Administrative data */}
        {geoData && (
          <div className="border-t border-border/50 pt-4 mt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Données administratives
            </p>
            <div className="space-y-1">
              <InfoRow 
                label="Code INSEE" 
                value={geoData.codeInsee || '-'}
                icon={<Building2 className="h-4 w-4" />}
                onCopy={geoData.codeInsee ? () => copyToClipboard(geoData.codeInsee, 'insee') : undefined}
              />
              <InfoRow 
                label="Département" 
                value={geoData.departement ? `${geoData.departement} (${geoData.codeDepartement})` : '-'}
                icon={<Globe className="h-4 w-4" />}
              />
              <InfoRow 
                label="Région" 
                value={geoData.region || '-'}
                icon={<Globe className="h-4 w-4" />}
              />
              {geoData.population && (
                <InfoRow 
                  label="Population commune" 
                  value={geoData.population.toLocaleString('fr-FR') + ' hab.'}
                  icon={<Building2 className="h-4 w-4" />}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </SmartBlock>
  );
};
