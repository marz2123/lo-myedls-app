import { useEffect, useState, useCallback } from 'react';
import { 
  MapPin, RefreshCw, Loader2, Map, FileText, AlertTriangle, 
  Building2, Cloud, Bot, Camera, Navigation, Compass, Mountain,
  Thermometer, Wind, Droplets, Sun, Calendar, Home, Ruler,
  Shield, Flame, Zap, Users, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Hooks
import { useGeoData, GeoEnrichedData } from '@/hooks/useGeoData';
import { useCadastralData, CadastralData } from '@/hooks/useCadastralData';
import { useGeorisques, GeorisquesResponse } from '@/hooks/useGeorisques';
import { useMeteoData, MeteoResponse } from '@/hooks/useMeteoData';
import { useUrbanContext, UrbanContextResponse } from '@/hooks/useUrbanContext';
import { useMapillary, MapillaryResponse } from '@/hooks/useMapillary';

// New block button component
import { 
  LocationBlockButton, 
  DetailSection, 
  DetailRow, 
  DetailGrid, 
  StatusChip 
} from './LocationBlockButton';

interface PropertyLocationSectionProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  postalCode?: string;
  city?: string;
  codeInsee?: string;
  onDataLoaded?: (data: {
    geoData?: GeoEnrichedData;
    cadastralData?: CadastralData;
    riskData?: GeorisquesResponse;
    meteoData?: MeteoResponse;
    urbanData?: UrbanContextResponse;
    mapillaryData?: MapillaryResponse;
  }) => void;
  compact?: boolean;
  className?: string;
}

export const PropertyLocationSection = ({
  latitude,
  longitude,
  address,
  postalCode,
  city,
  codeInsee,
  onDataLoaded,
  compact = false,
  className,
}: PropertyLocationSectionProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // All data hooks
  const { geoData, isLoading: geoLoading, fetchGeoData } = useGeoData();
  const { cadastralData, isLoading: cadastralLoading, fetchCadastralData, getCadastralPlanUrl } = useCadastralData();
  const { riskData, isLoading: riskLoading, fetchRiskData, getRiskLevel } = useGeorisques();
  const { meteoData, isLoading: meteoLoading, fetchMeteoData, getWeatherDescription } = useMeteoData();
  const { urbanData, isLoading: urbanLoading, fetchUrbanContext } = useUrbanContext();
  const { mapillaryData, isLoading: mapillaryLoading, fetchStreetImages } = useMapillary();

  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  // Load all data when coordinates change
  useEffect(() => {
    if (hasCoordinates) {
      loadAllData();
    }
  }, [latitude, longitude]);

  // Notify parent when data is loaded
  useEffect(() => {
    if (onDataLoaded) {
      onDataLoaded({
        geoData: geoData || undefined,
        cadastralData: cadastralData || undefined,
        riskData: riskData || undefined,
        meteoData: meteoData || undefined,
        urbanData: urbanData || undefined,
        mapillaryData: mapillaryData || undefined,
      });
    }
  }, [geoData, cadastralData, riskData, meteoData, urbanData, mapillaryData]);

  const loadAllData = useCallback(async () => {
    if (!hasCoordinates) return;
    
    setIsRefreshing(true);
    
    try {
      await Promise.all([
        fetchGeoData(latitude!, longitude!, codeInsee),
        fetchCadastralData(latitude!, longitude!),
        fetchRiskData(latitude!, longitude!, codeInsee),
        fetchMeteoData(latitude!, longitude!),
        fetchUrbanContext(latitude!, longitude!),
        fetchStreetImages(latitude!, longitude!),
      ]);
      toast.success('Données géographiques actualisées');
    } catch (err) {
      console.error('Error loading location data:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsRefreshing(false);
    }
  }, [latitude, longitude, codeInsee]);

  // Get risk count
  const getRiskCount = () => {
    if (!riskData?.risks) return 0;
    let count = 0;
    const { naturels, technologiques, autres } = riskData.risks;
    if (naturels.inondation) count++;
    if (naturels.seisme > 1) count++;
    if (naturels.feuForet) count++;
    if (naturels.avalanche) count++;
    if (naturels.volcan) count++;
    if (technologiques.icpe) count++;
    if (technologiques.nucleaire) count++;
    if (technologiques.canalisations) count++;
    if (autres.pprn) count++;
    if (autres.pprt) count++;
    return count;
  };

  const riskCount = getRiskCount();

  // Empty state
  if (!hasCoordinates) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-16 px-4",
        "bg-gradient-to-b from-muted/30 to-transparent rounded-2xl border border-dashed border-border",
        className
      )}>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Localisation du bien</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Saisissez une adresse pour afficher les informations géographiques, cadastrales, les risques et bien plus.
        </p>
      </div>
    );
  }

  // Compact view (for wizard preview)
  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Mini Map */}
        <div className="relative h-40 rounded-xl overflow-hidden border border-border/50">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude! - 0.003}%2C${latitude! - 0.002}%2C${longitude! + 0.003}%2C${latitude! + 0.002}&layer=mapnik&marker=${latitude}%2C${longitude}`}
            className="absolute inset-0 w-full h-full"
            style={{ border: 0 }}
          />
        </div>
        {/* Quick info */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
          <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{address}</p>
            <p className="text-xs text-muted-foreground">{postalCode} {city}</p>
          </div>
          {geoData && (
            <StatusChip status="success" label="Vérifié" />
          )}
        </div>
      </div>
    );
  }

  // Full premium view with block buttons
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Adresse du bien</h2>
            <p className="text-sm text-muted-foreground">
              {address ? `${address}, ${postalCode} ${city}` : 'Données enrichies automatiquement'}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={loadAllData}
          disabled={isRefreshing}
          className="gap-2"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualiser
        </Button>
      </div>

      {/* Block Buttons Grid */}
      <div className="grid gap-3">
        {/* Location Block */}
        <LocationBlockButton
          icon={<MapPin className="h-5 w-5" />}
          title="Localisation"
          subtitle="Coordonnées GPS et commune"
          status={geoData ? 'success' : geoLoading ? 'loading' : 'idle'}
          statusText={geoData ? `${city} - ${geoData.departement || ''}` : 'Chargement...'}
          isLoading={geoLoading}
        >
          <div className="space-y-6">
            <DetailSection title="Coordonnées GPS" icon={<Navigation className="h-4 w-4" />}>
              <DetailRow label="Latitude" value={latitude?.toFixed(6)} copyable />
              <DetailRow label="Longitude" value={longitude?.toFixed(6)} copyable />
              <DetailRow label="Altitude" value={geoData?.altitude ? `${geoData.altitude} m` : '—'} />
              <DetailRow label="Format DMS" value={geoData?.gpsFormatted?.dms || '—'} />
            </DetailSection>

            <DetailSection title="Localisation administrative" icon={<Building2 className="h-4 w-4" />}>
              <DetailRow label="Adresse" value={address} copyable />
              <DetailRow label="Code postal" value={postalCode} copyable />
              <DetailRow label="Commune" value={city} />
              <DetailRow label="Code INSEE" value={geoData?.codeInsee || codeInsee} copyable />
              <DetailRow label="Département" value={geoData?.departement} />
              <DetailRow label="Région" value={geoData?.region} />
            </DetailSection>

            {geoData && (
              <DetailSection title="Statistiques commune" icon={<Users className="h-4 w-4" />}>
                <DetailGrid
                  items={[
                    { label: 'Population', value: geoData.population?.toLocaleString() || '—', icon: <Users className="h-3 w-3" /> },
                    { label: 'Superficie', value: geoData.surface ? `${geoData.surface.toFixed(1)} km²` : '—', icon: <Ruler className="h-3 w-3" /> },
                  ]}
                />
              </DetailSection>
            )}

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir dans Google Maps
              </Button>
            </div>
          </div>
        </LocationBlockButton>

        {/* Map Block */}
        <LocationBlockButton
          icon={<Map className="h-5 w-5" />}
          title="Carte & Satellite"
          subtitle="Vue plan et satellite"
          status="success"
          statusText="3 types de vue disponibles"
        >
          <div className="space-y-6">
            <DetailSection title="Vue Plan">
              <div className="relative h-64 rounded-xl overflow-hidden">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude! - 0.005}%2C${latitude! - 0.003}%2C${longitude! + 0.005}%2C${latitude! + 0.003}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 0 }}
                />
              </div>
            </DetailSection>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                OpenStreetMap
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => window.open(`https://www.google.com/maps/@${latitude},${longitude},18z`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Google Maps
              </Button>
            </div>
          </div>
        </LocationBlockButton>

        {/* Cadastre Block */}
        <LocationBlockButton
          icon={<FileText className="h-5 w-5" />}
          title="Cadastre"
          subtitle="Références parcellaires"
          status={cadastralData?.parcels?.length ? 'success' : cadastralLoading ? 'loading' : 'idle'}
          statusText={cadastralData?.parcels?.[0] ? `Section ${cadastralData.parcels[0].section} - ${cadastralData.parcels[0].numero}` : 'Chargement...'}
          isLoading={cadastralLoading}
          dataCount={cadastralData?.parcels?.length}
        >
          <div className="space-y-6">
            {/* Plan cadastral intégré */}
            {hasCoordinates && (
              <DetailSection title="Plan cadastral" icon={<Map className="h-4 w-4" />}>
                <div className="relative h-64 rounded-xl overflow-hidden border">
                  <iframe
                    src={`https://cadastre.data.gouv.fr/map#18/${latitude}/${longitude}`}
                    className="absolute inset-0 w-full h-full"
                    title="Plan cadastral"
                    loading="lazy"
                    style={{ border: 0 }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 gap-2"
                  onClick={() => window.open(`https://cadastre.data.gouv.fr/map#18/${latitude}/${longitude}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Agrandir le plan cadastral
                </Button>
              </DetailSection>
            )}

            {cadastralData?.parcels?.[0] && (
              <>
                <DetailSection title="Références cadastrales" icon={<FileText className="h-4 w-4" />}>
                  <DetailRow label="Section" value={cadastralData.parcels[0].section} copyable />
                  <DetailRow label="Numéro parcelle" value={cadastralData.parcels[0].numero} copyable />
                  <DetailRow label="Préfixe" value={cadastralData.parcels[0].prefixe || '000'} />
                  <DetailRow label="Code commune" value={cadastralData.communeCode} copyable />
                  <DetailRow label="Nom commune" value={cadastralData.communeName} />
                </DetailSection>

                <DetailSection title="Caractéristiques parcelle" icon={<Ruler className="h-4 w-4" />}>
                  <DetailGrid
                    items={[
                      { 
                        label: 'Contenance', 
                        value: cadastralData.parcels[0].contenance ? `${cadastralData.parcels[0].contenance.toLocaleString('fr-FR')} m²` : '—',
                        icon: <Ruler className="h-3 w-3" />,
                        highlight: true
                      },
                      { 
                        label: 'ID Parcelle', 
                        value: cadastralData.parcels[0].id || '—',
                        icon: <FileText className="h-3 w-3" />
                      },
                    ]}
                  />
                </DetailSection>
              </>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => {
                  if (cadastralData?.communeCode) {
                    const url = getCadastralPlanUrl(
                      cadastralData.communeCode,
                      cadastralData.parcels?.[0]?.section,
                      cadastralData.parcels?.[0]?.numero
                    );
                    window.open(url, '_blank');
                  }
                }}
                disabled={!cadastralData?.communeCode}
              >
                <ExternalLink className="h-4 w-4" />
                Plan cadastral
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => window.open(`https://www.cadastre.gouv.fr/scpc/rechercherPlan.do`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Cadastre.gouv
              </Button>
            </div>
          </div>
        </LocationBlockButton>

        {/* Street View Block */}
        <LocationBlockButton
          icon={<Camera className="h-5 w-5" />}
          title="Street View"
          subtitle="Images de rue"
          status={mapillaryData?.closestImage ? 'success' : mapillaryLoading ? 'loading' : 'warning'}
          statusText={mapillaryData?.closestImage ? `${mapillaryData.images?.length || 1} image(s) disponible(s)` : 'Recherche d\'images...'}
          dataCount={mapillaryData?.images?.length}
          isLoading={mapillaryLoading}
        >
          <div className="space-y-6">
            {mapillaryData?.closestImage ? (
              <>
                <DetailSection title="Image la plus proche">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <img
                      src={mapillaryData.closestImage.thumb_1024_url || mapillaryData.closestImage.thumb_256_url}
                      alt="Street View"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                      <span className="px-2 py-1 bg-black/70 rounded text-xs text-white">
                        {new Date(mapillaryData.closestImage.captured_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="px-2 py-1 bg-black/70 rounded text-xs text-white">
                        Mapillary
                      </span>
                    </div>
                  </div>
                </DetailSection>

                <DetailSection title="Informations image" icon={<Camera className="h-4 w-4" />}>
                  <DetailRow label="Date de capture" value={new Date(mapillaryData.closestImage.captured_at).toLocaleDateString('fr-FR')} />
                  <DetailRow label="ID Image" value={mapillaryData.closestImage.id?.toString().substring(0, 12) + '...'} copyable />
                  <DetailRow label="Angle" value={`${mapillaryData.closestImage.compass_angle}°`} />
                  <DetailRow label="Panorama" value={mapillaryData.closestImage.is_pano ? 'Oui' : 'Non'} />
                </DetailSection>

                {mapillaryData.images && mapillaryData.images.length > 1 && (
                  <DetailSection title={`Autres images (${mapillaryData.images.length - 1})`}>
                    <div className="grid grid-cols-3 gap-2">
                      {mapillaryData.images.slice(1, 7).map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={img.thumb_256_url}
                            alt={`Vue ${idx + 2}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune image street view disponible</p>
                <p className="text-xs text-muted-foreground mt-1">Essayez Google Street View</p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => window.open(`https://www.google.com/maps/@${latitude},${longitude},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir Google Street View
            </Button>
          </div>
        </LocationBlockButton>

        {/* Risks Block */}
        <LocationBlockButton
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Risques & Dangers"
          subtitle="Géorisques officiels"
          status={riskCount > 5 ? 'warning' : riskCount > 0 ? 'success' : riskLoading ? 'loading' : 'idle'}
          statusText={riskData ? `${riskCount} risque(s) identifié(s)` : 'Analyse en cours...'}
          dataCount={riskCount}
          isLoading={riskLoading}
        >
          <div className="space-y-6">
            {riskData?.risks && (
              <>
                <DetailSection title="Synthèse des risques" icon={<Shield className="h-4 w-4" />}>
                  <DetailGrid
                    items={[
                      { 
                        label: 'Total risques', 
                        value: riskCount,
                        highlight: riskCount > 5
                      },
                      { 
                        label: 'Niveau global', 
                        value: riskData.risks ? (getRiskLevel(riskData.risks) === 'high' ? 'Élevé' : getRiskLevel(riskData.risks) === 'medium' ? 'Modéré' : 'Faible') : 'N/A'
                      },
                    ]}
                  />
                </DetailSection>

                <DetailSection title="Risques naturels" icon={<Mountain className="h-4 w-4" />}>
                  <div className="space-y-2">
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      riskData.risks.naturels.inondation ? "bg-amber-100 dark:bg-amber-900/30" : "bg-background"
                    )}>
                      <Droplets className={cn("h-5 w-5", riskData.risks.naturels.inondation ? "text-amber-600" : "text-muted-foreground")} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Inondation</p>
                      </div>
                      <StatusChip 
                        status={riskData.risks.naturels.inondation ? 'warning' : 'success'} 
                        label={riskData.risks.naturels.inondation ? 'Oui' : 'Non'}
                      />
                    </div>

                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      riskData.risks.naturels.seisme > 2 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-background"
                    )}>
                      <Zap className={cn("h-5 w-5", riskData.risks.naturels.seisme > 2 ? "text-amber-600" : "text-muted-foreground")} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Séisme</p>
                      </div>
                      <StatusChip 
                        status={riskData.risks.naturels.seisme > 3 ? 'error' : riskData.risks.naturels.seisme > 2 ? 'warning' : 'success'} 
                        label={`Zone ${riskData.risks.naturels.seisme}`}
                      />
                    </div>

                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      riskData.risks.naturels.feuForet ? "bg-amber-100 dark:bg-amber-900/30" : "bg-background"
                    )}>
                      <Flame className={cn("h-5 w-5", riskData.risks.naturels.feuForet ? "text-amber-600" : "text-muted-foreground")} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Feu de forêt</p>
                      </div>
                      <StatusChip 
                        status={riskData.risks.naturels.feuForet ? 'warning' : 'success'} 
                        label={riskData.risks.naturels.feuForet ? 'Oui' : 'Non'}
                      />
                    </div>

                    <DetailRow label="Radon" value={`Potentiel ${riskData.risks.naturels.radon}/3`} />
                    <DetailRow label="Argiles" value={riskData.risks.naturels.argiles} />
                  </div>
                </DetailSection>

                <DetailSection title="Risques technologiques" icon={<Zap className="h-4 w-4" />}>
                  <DetailRow label="ICPE (Installations classées)" value={riskData.risks.technologiques.icpe ? 'Oui' : 'Non'} />
                  <DetailRow label="Nucléaire" value={riskData.risks.technologiques.nucleaire ? 'Oui' : 'Non'} />
                  <DetailRow label="Canalisations" value={riskData.risks.technologiques.canalisations ? 'Oui' : 'Non'} />
                </DetailSection>

                <DetailSection title="Plans de prévention">
                  <DetailRow label="PPRN (Risques naturels)" value={riskData.risks.autres.pprn ? 'Oui' : 'Non'} />
                  <DetailRow label="PPRT (Risques technologiques)" value={riskData.risks.autres.pprt ? 'Oui' : 'Non'} />
                  <DetailRow label="Arrêtés CATNAT" value={riskData.risks.autres.catnat.toString()} />
                </DetailSection>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => window.open(`https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Rapport Géorisques complet
            </Button>
          </div>
        </LocationBlockButton>

        {/* Urban Context Block */}
        <LocationBlockButton
          icon={<Building2 className="h-5 w-5" />}
          title="Contexte Urbain"
          subtitle="Environnement & équipements"
          status={urbanData?.data ? 'success' : urbanLoading ? 'loading' : 'idle'}
          statusText={urbanData?.data?.neighborhoodType || 'Analyse...'}
          isLoading={urbanLoading}
        >
          <div className="space-y-6">
            {urbanData?.data && (
              <>
                <DetailSection title="Bâtiment cible" icon={<Home className="h-4 w-4" />}>
                  <DetailRow label="Type" value={urbanData.data.buildingType || '—'} />
                  <DetailRow label="Niveaux" value={urbanData.data.buildingLevels?.toString() || '—'} />
                  <DetailRow label="Hauteur" value={urbanData.data.buildingHeight ? `${urbanData.data.buildingHeight} m` : '—'} />
                  <DetailRow label="Année" value={urbanData.data.buildingYear || '—'} />
                  <DetailRow label="Matériau" value={urbanData.data.buildingMaterial || '—'} />
                </DetailSection>

                <DetailSection title="Quartier" icon={<Building2 className="h-4 w-4" />}>
                  <DetailGrid
                    items={[
                      { label: 'Type zone', value: urbanData.data.neighborhoodType || '—' },
                      { label: 'Densité', value: urbanData.data.neighborhoodDensity || '—' },
                      { label: 'Hauteur moy.', value: urbanData.data.avgBuildingHeight ? `${urbanData.data.avgBuildingHeight} m` : '—' },
                      { label: 'Niveaux moy.', value: urbanData.data.avgBuildingLevels?.toString() || '—' },
                    ]}
                  />
                </DetailSection>

                {urbanData.data.quarterName && (
                  <DetailRow label="Quartier" value={urbanData.data.quarterName} />
                )}
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => window.open(`https://www.openstreetmap.org/#map=18/${latitude}/${longitude}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Explorer sur OpenStreetMap
            </Button>
          </div>
        </LocationBlockButton>

        {/* Climate Block */}
        <LocationBlockButton
          icon={<Cloud className="h-5 w-5" />}
          title="Climat & Météo"
          subtitle="Conditions actuelles et historique"
          status={meteoData?.climate ? 'success' : meteoLoading ? 'loading' : 'idle'}
          statusText={meteoData?.climate ? `${meteoData.climate.temperature}°C - ${getWeatherDescription(meteoData.climate.weatherCode)}` : 'Chargement...'}
          isLoading={meteoLoading}
        >
          <div className="space-y-6">
            {meteoData?.climate && (
              <>
                <DetailSection title="Conditions actuelles" icon={<Sun className="h-4 w-4" />}>
                  <DetailGrid
                    items={[
                      { 
                        label: 'Température', 
                        value: `${meteoData.climate.temperature}°C`,
                        icon: <Thermometer className="h-3 w-3" />,
                        highlight: true
                      },
                      { 
                        label: 'Humidité', 
                        value: `${meteoData.climate.humidity}%`,
                        icon: <Droplets className="h-3 w-3" />
                      },
                      { 
                        label: 'Vent', 
                        value: `${meteoData.climate.windSpeed} km/h`,
                        icon: <Wind className="h-3 w-3" />
                      },
                      { 
                        label: 'Direction', 
                        value: `${meteoData.climate.windDirection}°`,
                        icon: <Compass className="h-3 w-3" />
                      },
                    ]}
                  />
                </DetailSection>

                <DetailSection title="Précipitations" icon={<Droplets className="h-4 w-4" />}>
                  <DetailRow label="Précipitations" value={`${meteoData.climate.precipitation} mm`} />
                  <DetailRow label="Conditions" value={getWeatherDescription(meteoData.climate.weatherCode)} />
                </DetailSection>

                <DetailSection title="Moyennes annuelles" icon={<Calendar className="h-4 w-4" />}>
                  <DetailGrid
                    items={[
                      { label: 'Temp. max moy.', value: `${meteoData.climate.annualTemperatureMax?.toFixed(1) || '—'}°C` },
                      { label: 'Temp. min moy.', value: `${meteoData.climate.annualTemperatureMin?.toFixed(1) || '—'}°C` },
                      { label: 'Précip. annuelles', value: `${meteoData.climate.annualPrecipitation?.toFixed(0) || '—'} mm` },
                      { label: 'Ensoleillement', value: `${meteoData.climate.annualSunshineHours?.toFixed(0) || '—'} h/an` },
                    ]}
                  />
                </DetailSection>

                <DetailSection title="Exposition">
                  <DetailRow label="Vent dominant" value={meteoData.climate.dominantWindDirection || '—'} />
                  <DetailRow label="Exposition solaire" value={meteoData.climate.solarExposure || '—'} />
                </DetailSection>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => window.open(`https://www.meteofrance.com/`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Prévisions Météo France
            </Button>
          </div>
        </LocationBlockButton>

        {/* AI Analysis Block */}
        <LocationBlockButton
          icon={<Bot className="h-5 w-5" />}
          title="Analyse IA"
          subtitle="Estimation automatique du bâtiment"
          status="idle"
          statusText="Cliquez pour lancer l'analyse"
        >
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-violet-500" />
              </div>
              <h4 className="font-semibold mb-2">Analyse IA du bâtiment</h4>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                L'intelligence artificielle peut analyser les images disponibles pour estimer les caractéristiques du bâtiment : type, époque, état de façade, etc.
              </p>
              <Button className="gap-2">
                <Bot className="h-4 w-4" />
                Lancer l'analyse IA
              </Button>
            </div>

            <DetailSection title="Données analysées">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Images Street View (Mapillary)</p>
                <p>• Imagerie satellite</p>
                <p>• Données cadastrales</p>
                <p>• Contexte urbain</p>
              </div>
            </DetailSection>
          </div>
        </LocationBlockButton>
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Données: BAN · Cadastre · Géorisques · Open-Meteo · OpenStreetMap · Mapillary
        </p>
      </div>
    </div>
  );
};

// Re-export types for convenience
export type { GeoEnrichedData } from '@/hooks/useGeoData';
export type { CadastralData } from '@/hooks/useCadastralData';
export type { GeorisquesResponse } from '@/hooks/useGeorisques';
