import React, { useEffect, useState, useCallback } from 'react';
import { 
  MapPin, FileText, Building2, Euro, Camera, Mountain, 
  AlertTriangle, Book, Bot, TreePine, Cloud, ChevronDown,
  ExternalLink, Loader2, RefreshCw, Check, Copy, Users,
  Ruler, Shield, Thermometer, Wind, Droplets, Sun, Home,
  Car, GraduationCap, ShoppingCart, Train, Heart, Leaf,
  Plane, Map, Layers, Eye, Trees, ParkingCircle, Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Hooks
import { useGeoData } from '@/hooks/useGeoData';
import { useCadastralData } from '@/hooks/useCadastralData';
import { useGeorisques } from '@/hooks/useGeorisques';
import { useMeteoData } from '@/hooks/useMeteoData';
import { useUrbanContext } from '@/hooks/useUrbanContext';
import { useMapillary } from '@/hooks/useMapillary';
import { useDVFData } from '@/hooks/useDVFData';
import { usePLUData } from '@/hooks/usePLUData';
import { useNeighborhoodData } from '@/hooks/useNeighborhoodData';
import { useBuildingAIAnalysis } from '@/hooks/useBuildingAIAnalysis';
import { usePappersData } from '@/hooks/usePappersData';
import { useAerialImagery } from '@/hooks/useAerialImagery';
import { PropertyOwnersBlock } from './PropertyOwnersBlock';

interface PropertyDataSheetProps {
  address: string;
  postalCode: string;
  city: string;
  lat?: number;
  lon?: number;
  codeInsee?: string;
  className?: string;
}

// Accent color mapping for Tailwind classes
const accentColorClasses: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
};

// Premium Card Component
const PremiumCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  status?: 'loading' | 'success' | 'error' | 'empty';
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  accentColor?: string;
}> = ({ icon, title, subtitle, status, badge, children, defaultOpen = true, className, accentColor = 'primary' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors = accentColorClasses[accentColor] || accentColorClasses.primary;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "bg-card rounded-3xl border border-border/40 overflow-hidden",
        "shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
              colors.bg
            )}>
              {status === 'loading' ? (
                <Loader2 className={cn("h-6 w-6 animate-spin", colors.text)} />
              ) : (
                <span className={colors.text}>{icon}</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-[17px]">{title}</h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              {status === 'success' && <Check className="h-5 w-5 text-emerald-500" />}
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground/50 transition-transform duration-300",
                isOpen && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-0">
            <div className="border-t border-border/30 pt-4">
              {children}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// Data Row Component
const DataRow: React.FC<{
  label: string;
  value: string | number | React.ReactNode;
  copyable?: boolean;
  highlight?: boolean;
}> = ({ label, value, copyable, highlight }) => {
  const handleCopy = () => {
    if (typeof value === 'string' || typeof value === 'number') {
      navigator.clipboard.writeText(String(value));
      toast.success('Copié');
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between py-3 border-b border-border/20 last:border-0",
      highlight && "bg-primary/5 -mx-4 px-4 rounded-lg"
    )}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-medium", highlight && "text-primary")}>{value || '—'}</span>
        {copyable && value && (
          <button onClick={handleCopy} className="p-1 hover:bg-muted rounded transition-colors">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down';
  color?: string;
}> = ({ icon, label, value, trend, color = 'primary' }) => {
  const colors = accentColorClasses[color] || accentColorClasses.primary;
  return (
    <div className="p-4 rounded-2xl bg-muted/30 text-center">
      <div className={cn("w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center", colors.bg)}>
        <span className={colors.text}>{icon}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {trend && (
        <span className={cn("text-xs", trend === 'up' ? 'text-emerald-500' : 'text-red-500')}>
          {trend === 'up' ? '↑' : '↓'}
        </span>
      )}
    </div>
  );
};

export const PropertyDataSheet: React.FC<PropertyDataSheetProps> = ({
  address,
  postalCode,
  city,
  lat,
  lon,
  codeInsee,
  className,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // All hooks
  const { geoData, isLoading: geoLoading, fetchGeoData } = useGeoData();
  const { cadastralData, isLoading: cadastralLoading, fetchCadastralData, getCadastralPlanUrl } = useCadastralData();
  const { riskData, isLoading: riskLoading, fetchRiskData, getRiskLevel } = useGeorisques();
  const { meteoData, isLoading: meteoLoading, fetchMeteoData } = useMeteoData();
  const { urbanData, isLoading: urbanLoading, fetchUrbanContext } = useUrbanContext();
  const { mapillaryData, isLoading: mapillaryLoading, fetchStreetImages } = useMapillary();
  const { dvfData, isLoading: dvfLoading, fetchDVFData } = useDVFData();
  const { pluData, isLoading: pluLoading, fetchPLUData } = usePLUData();
  const { neighborhoodData, isLoading: neighborhoodLoading, fetchNeighborhoodData } = useNeighborhoodData();
  const { aiAnalysis, isLoading: aiLoading, analyzeBuilding, getConditionColor, getDPEColor } = useBuildingAIAnalysis();
  const { data: pappersData, isLoading: pappersLoading, error: pappersError, fetchPropertyOwners } = usePappersData();
  const { aerialData, isLoading: aerialLoading, fetchAerialImagery } = useAerialImagery();

  // State for aerial view mode
  const [aerialViewMode, setAerialViewMode] = useState<'plan' | 'satellite' | 'hybrid'>('satellite');
  
  const hasCoordinates = lat !== undefined && lon !== undefined;

  // Load all data
  const loadAllData = useCallback(async () => {
    if (!hasCoordinates) return;
    setIsRefreshing(true);

    try {
      await Promise.all([
        fetchGeoData(lat!, lon!, codeInsee),
        fetchCadastralData(lat!, lon!),
        fetchRiskData(lat!, lon!, codeInsee),
        fetchMeteoData(lat!, lon!),
        fetchUrbanContext(lat!, lon!),
        fetchStreetImages(lat!, lon!),
        fetchDVFData(lat!, lon!, codeInsee),
        fetchPLUData(lat!, lon!, codeInsee),
        fetchNeighborhoodData(lat!, lon!),
        fetchPropertyOwners(`${address}, ${postalCode} ${city}`, lat!, lon!),
        fetchAerialImagery(lat!, lon!),
      ]);
      toast.success('Données actualisées');
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsRefreshing(false);
    }
  }, [lat, lon, codeInsee, hasCoordinates, address, postalCode, city]);

  // Auto-load on mount
  useEffect(() => {
    if (hasCoordinates) {
      loadAllData();
    }
  }, [lat, lon]);

  // Auto-trigger AI analysis when Mapillary data becomes available
  useEffect(() => {
    if (mapillaryData?.closestImage && !aiAnalysis && !aiLoading && hasCoordinates) {
      const imageUrl = mapillaryData.closestImage.thumb_1024_url;
      analyzeBuilding(lat!, lon!, `${address}, ${postalCode} ${city}`, imageUrl);
    }
  }, [mapillaryData, aiAnalysis, aiLoading, hasCoordinates, lat, lon, address, postalCode, city, analyzeBuilding]);

  // Trigger AI analysis manually
  const handleAIAnalysis = () => {
    if (!hasCoordinates) return;
    const imageUrl = mapillaryData?.closestImage?.thumb_1024_url;
    analyzeBuilding(lat!, lon!, `${address}, ${postalCode} ${city}`, imageUrl);
  };

  // Count risks
  const riskCount = riskData?.risks ? 
    Object.values(riskData.risks.naturels).filter(v => v === true || (typeof v === 'number' && v > 2)).length +
    Object.values(riskData.risks.technologiques).filter(Boolean).length : 0;

  if (!hasCoordinates) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-20 px-6", className)}>
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <MapPin className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Fiche Bien Premium</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Saisissez une adresse pour générer automatiquement la fiche complète du bien avec toutes les données disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Fiche Bien Premium
          </h1>
          <p className="text-sm text-muted-foreground">{address}, {postalCode} {city}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">11 sections</Badge>
            {!isRefreshing && (
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                <Check className="h-3 w-3 mr-1" />
                Données complètes
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAllData}
          disabled={isRefreshing}
          className="gap-2 rounded-full"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualiser
        </Button>
      </div>

      {/* 1. PROPRIÉTAIRES & FONCIER */}
      <PropertyOwnersBlock
        data={pappersData}
        isLoading={pappersLoading}
        error={pappersError}
      />

      {/* 2. LOCALISATION */}
      <PremiumCard
        icon={<MapPin className="h-6 w-6" />}
        title="Localisation"
        subtitle="Coordonnées GPS & Commune"
        status={geoLoading ? 'loading' : geoData ? 'success' : 'empty'}
        badge={geoData && <Badge variant="secondary" className="text-xs">Vérifié</Badge>}
      >
        <div className="space-y-1">
          <DataRow label="Latitude" value={lat?.toFixed(6)} copyable />
          <DataRow label="Longitude" value={lon?.toFixed(6)} copyable />
          <DataRow label="Altitude" value={geoData?.altitude ? `${geoData.altitude} m` : '—'} />
          <DataRow label="Code INSEE" value={geoData?.codeInsee || codeInsee} copyable />
          <DataRow label="Département" value={geoData?.departement} />
          <DataRow label="Région" value={geoData?.region} />
          <DataRow label="Orientation" value={geoData?.orientation} />
        </div>
        
        {/* Mini Map */}
        <div className="mt-4 rounded-2xl overflow-hidden border h-48">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon! - 0.003},${lat! - 0.002},${lon! + 0.003},${lat! + 0.002}&layer=mapnik&marker=${lat},${lon}`}
            className="w-full h-full"
            title="Carte"
          />
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir dans Google Maps
        </Button>
      </PremiumCard>

      {/* 3. CADASTRE */}
      <PremiumCard
        icon={<FileText className="h-6 w-6" />}
        title="Cadastre & Foncier"
        subtitle={cadastralData?.parcels?.[0] ? `Parcelle ${cadastralData.parcels[0].section} ${cadastralData.parcels[0].numero}` : 'Références cadastrales'}
        status={cadastralLoading ? 'loading' : cadastralData?.parcels?.length ? 'success' : 'empty'}
        accentColor="amber"
      >
        {/* Cadastral Map */}
        <div className="rounded-2xl overflow-hidden border h-48 mb-4">
          <iframe
            src={`https://cadastre.data.gouv.fr/map#18/${lat}/${lon}`}
            className="w-full h-full"
            title="Plan cadastral"
          />
        </div>
        
        {cadastralData?.parcels?.[0] && (
          <div className="space-y-1">
            <DataRow label="Section" value={cadastralData.parcels[0].section} copyable />
            <DataRow label="Numéro" value={cadastralData.parcels[0].numero} copyable />
            <DataRow label="Surface" value={cadastralData.parcels[0].contenance ? `${cadastralData.parcels[0].contenance.toLocaleString('fr-FR')} m²` : '—'} highlight />
            <DataRow label="Commune" value={cadastralData.communeName} />
            <DataRow label="Code commune" value={cadastralData.communeCode} copyable />
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => window.open('https://www.cadastre.gouv.fr', '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Consulter cadastre.gouv.fr
        </Button>
      </PremiumCard>

      {/* 4. DVF - PRIX DU MARCHÉ */}
      <PremiumCard
        icon={<Euro className="h-6 w-6" />}
        title="Prix du Marché"
        subtitle={dvfData?.stats ? `${dvfData.stats.totalTransactions} transactions à proximité` : 'Valeurs foncières DVF'}
        status={dvfLoading ? 'loading' : dvfData?.stats ? 'success' : 'empty'}
        accentColor="emerald"
      >
        {dvfData?.stats && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard
                icon={<Building2 className="h-5 w-5" />}
                label="Prix/m² Appart"
                value={dvfData.stats.avgPriceM2Appartement ? `${dvfData.stats.avgPriceM2Appartement.toLocaleString('fr-FR')} €` : '—'}
                color="emerald"
              />
              <StatCard
                icon={<Home className="h-5 w-5" />}
                label="Prix/m² Maison"
                value={dvfData.stats.avgPriceM2Maison ? `${dvfData.stats.avgPriceM2Maison.toLocaleString('fr-FR')} €` : '—'}
                color="blue"
              />
            </div>
            
            {dvfData.stats.nearbyTransactions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transactions récentes</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dvfData.stats.nearbyTransactions.slice(0, 5).map((t, i) => (
                    <div key={i} className="p-3 bg-muted/30 rounded-xl text-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{t.type_local}</span>
                        <span className="text-emerald-600 font-semibold">{t.valeur_fonciere.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.surface_reelle_bati || t.surface_terrain} m² • {new Date(t.date_mutation).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => window.open('https://app.dvf.etalab.gouv.fr/', '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Explorer DVF
        </Button>
      </PremiumCard>

      {/* 5. STREET VIEW */}
      <PremiumCard
        icon={<Camera className="h-6 w-6" />}
        title="Vue de Rue"
        subtitle={mapillaryData?.closestImage ? 'Image Mapillary disponible' : 'Vue panoramique'}
        status={mapillaryLoading ? 'loading' : mapillaryData?.closestImage ? 'success' : 'empty'}
        accentColor="purple"
      >
        {mapillaryData?.closestImage ? (
          <>
            <div className="rounded-2xl overflow-hidden border aspect-video mb-4">
              <img
                src={mapillaryData.closestImage.thumb_1024_url || mapillaryData.closestImage.thumb_256_url}
                alt="Vue de rue"
                className="w-full h-full object-cover"
              />
            </div>
            <DataRow label="Date de capture" value={new Date(mapillaryData.closestImage.captured_at).toLocaleDateString('fr-FR')} />
            <DataRow label="Orientation" value={mapillaryData.closestImage.compass_angle ? `${Math.round(mapillaryData.closestImage.compass_angle)}°` : '—'} />
          </>
        ) : (
          <div className="text-center py-8">
            <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune image disponible</p>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => window.open(`https://www.google.com/maps/@${lat},${lon},3a,75y,0h,90t/data=!3m4!1e1`, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Google Street View
        </Button>
      </PremiumCard>

      {/* 6. VUE AÉRIENNE & SATELLITE */}
      <PremiumCard
        icon={<Plane className="h-6 w-6" />}
        title="Vue Aérienne & Satellite"
        subtitle={aerialData ? 'Images HD disponibles' : 'Vue aérienne du bien'}
        status={aerialLoading ? 'loading' : aerialData ? 'success' : 'empty'}
        accentColor="blue"
      >
        {/* View Mode Selector */}
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={aerialViewMode === 'plan' ? 'default' : 'outline'}
            onClick={() => setAerialViewMode('plan')}
            className="flex-1 gap-2"
          >
            <Map className="h-4 w-4" />
            Plan
          </Button>
          <Button
            size="sm"
            variant={aerialViewMode === 'satellite' ? 'default' : 'outline'}
            onClick={() => setAerialViewMode('satellite')}
            className="flex-1 gap-2"
          >
            <Layers className="h-4 w-4" />
            Satellite
          </Button>
          <Button
            size="sm"
            variant={aerialViewMode === 'hybrid' ? 'default' : 'outline'}
            onClick={() => setAerialViewMode('hybrid')}
            className="flex-1 gap-2"
          >
            <Eye className="h-4 w-4" />
            Hybrid
          </Button>
        </div>

        {/* Map Display */}
        <div className="rounded-2xl overflow-hidden border aspect-video mb-4 bg-muted/20">
          {aerialViewMode === 'plan' && (
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon! - 0.003},${lat! - 0.002},${lon! + 0.003},${lat! + 0.002}&layer=mapnik&marker=${lat},${lon}`}
              className="w-full h-full"
              title="Vue plan"
            />
          )}
          {aerialViewMode === 'satellite' && (
            <img
              src={aerialData?.satelliteUrl || `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lon! - 0.002},${lat! - 0.0015},${lon! + 0.002},${lat! + 0.0015}&bboxSR=4326&imageSR=4326&size=600,400&format=png&f=image`}
              alt="Vue satellite"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon! - 0.003},${lat! - 0.002},${lon! + 0.003},${lat! + 0.002}&layer=cyclemap&marker=${lat},${lon}`;
              }}
            />
          )}
          {aerialViewMode === 'hybrid' && (
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon! - 0.003},${lat! - 0.002},${lon! + 0.003},${lat! + 0.002}&layer=cyclemap&marker=${lat},${lon}`}
              className="w-full h-full"
              title="Vue hybride"
            />
          )}
        </div>

        {/* Detected Features from Aerial */}
        {aerialData?.detectedFeatures && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className={cn(
              "p-3 rounded-xl text-center",
              aerialData.detectedFeatures.vegetation ? 'bg-green-500/10' : 'bg-muted/30'
            )}>
              <Trees className={cn("h-5 w-5 mx-auto mb-1", aerialData.detectedFeatures.vegetation ? 'text-green-600' : 'text-muted-foreground')} />
              <p className="text-xs font-medium">
                {aerialData.detectedFeatures.vegetation ? 'Végétation détectée' : 'Peu de végétation'}
              </p>
            </div>
            <div className={cn(
              "p-3 rounded-xl text-center",
              aerialData.detectedFeatures.pool ? 'bg-blue-500/10' : 'bg-muted/30'
            )}>
              <Waves className={cn("h-5 w-5 mx-auto mb-1", aerialData.detectedFeatures.pool ? 'text-blue-600' : 'text-muted-foreground')} />
              <p className="text-xs font-medium">
                {aerialData.detectedFeatures.pool ? 'Piscine détectée' : 'Pas de piscine'}
              </p>
            </div>
            {aerialData.detectedFeatures.parkingSpots !== undefined && aerialData.detectedFeatures.parkingSpots > 0 && (
              <div className="p-3 rounded-xl text-center bg-slate-500/10">
                <ParkingCircle className="h-5 w-5 mx-auto mb-1 text-slate-600" />
                <p className="text-xs font-medium">~{aerialData.detectedFeatures.parkingSpots} places</p>
              </div>
            )}
            {aerialData.detectedFeatures.roofType && (
              <div className="p-3 rounded-xl text-center bg-amber-500/10">
                <Home className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs font-medium">{aerialData.detectedFeatures.roofType}</p>
              </div>
            )}
          </div>
        )}

        {aerialData?.coverage && (
          <DataRow label="Résolution" value={aerialData.coverage.resolution || 'Standard'} />
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => window.open(`https://www.geoportail.gouv.fr/carte?c=${lon},${lat}&z=18&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Voir sur Géoportail
        </Button>
      </PremiumCard>

      {/* 7. RISQUES */}
      <PremiumCard
        icon={<AlertTriangle className="h-6 w-6" />}
        title="Risques & Sécurité"
        subtitle={riskCount > 0 ? `${riskCount} risque(s) identifié(s)` : 'Analyse des risques'}
        status={riskLoading ? 'loading' : riskData ? 'success' : 'empty'}
        badge={riskCount > 0 && <Badge variant="destructive" className="text-xs">{riskCount}</Badge>}
        accentColor="red"
      >
        {riskData?.risks && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risques naturels</h4>
              <DataRow label="Inondation" value={riskData.risks.naturels.inondation ? '⚠️ Zone à risque' : '✅ Hors zone'} />
              <DataRow label="Zone sismique" value={`Zone ${riskData.risks.naturels.seisme}`} />
              <DataRow label="Argiles" value={riskData.risks.naturels.argiles} />
              <DataRow label="Radon" value={`Potentiel ${riskData.risks.naturels.radon}`} />
              <DataRow label="Feu de forêt" value={riskData.risks.naturels.feuForet ? '⚠️ Zone à risque' : '✅ Hors zone'} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risques technologiques</h4>
              <DataRow label="ICPE" value={riskData.risks.technologiques.icpe ? '⚠️ À proximité' : '✅ Aucune'} />
              <DataRow label="Zone nucléaire" value={riskData.risks.technologiques.nucleaire ? '⚠️ Oui' : '✅ Non'} />
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => window.open('https://www.georisques.gouv.fr/', '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Consulter Géorisques
        </Button>
      </PremiumCard>

      {/* 8. PLU URBANISME */}
      <PremiumCard
        icon={<Book className="h-6 w-6" />}
        title="Urbanisme & PLU"
        subtitle={pluData?.zone ? `Zone ${pluData.zone.code}` : 'Réglementation locale'}
        status={pluLoading ? 'loading' : pluData ? 'success' : 'empty'}
        accentColor="indigo"
      >
        {pluData && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <span className="font-bold text-indigo-600">{pluData.zone?.code || '?'}</span>
                </div>
                <div>
                  <p className="font-semibold">{pluData.zone?.libelle || 'Zone non définie'}</p>
                  <p className="text-xs text-muted-foreground">{pluData.zone?.destdomi || 'Destination mixte'}</p>
                </div>
              </div>
            </div>
            
            <DataRow label="Commune avec PLU" value={pluData.communeHasPLU ? '✅ Oui' : '❌ Non'} />
            <DataRow label="Périmètre ABF" value={pluData.abf.inPerimeter ? '⚠️ Monument historique à proximité' : '✅ Hors périmètre'} />
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => window.open('https://www.geoportail-urbanisme.gouv.fr/', '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Géoportail Urbanisme
        </Button>
      </PremiumCard>

      {/* 9. QUARTIER */}
      <PremiumCard
        icon={<TreePine className="h-6 w-6" />}
        title="Vie de Quartier"
        subtitle={neighborhoodData ? `Score piéton: ${neighborhoodData.walkScore}/100` : 'Environnement & Services'}
        status={neighborhoodLoading ? 'loading' : neighborhoodData ? 'success' : 'empty'}
        accentColor="green"
      >
        {neighborhoodData && (
          <>
            {/* Walk Score */}
            <div className="p-4 bg-green-500/10 rounded-2xl mb-4 text-center">
              <p className="text-4xl font-bold text-green-600">{neighborhoodData.walkScore}</p>
              <p className="text-sm text-muted-foreground">Score piéton /100</p>
            </div>
            
            {/* Amenities Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {Object.entries(neighborhoodData.amenities).map(([key, cat]) => (
                <div key={key} className="p-3 bg-muted/30 rounded-xl text-center">
                  <span className="text-xl">{cat.icon}</span>
                  <p className="text-lg font-bold">{cat.count}</p>
                  <p className="text-xs text-muted-foreground truncate">{cat.name}</p>
                </div>
              ))}
            </div>
            
            {/* Air Quality */}
            {neighborhoodData.airQuality && (
              <DataRow 
                label="Qualité de l'air" 
                value={<span className={cn(
                  neighborhoodData.airQuality.level === 'Bon' ? 'text-green-600' :
                  neighborhoodData.airQuality.level === 'Modéré' ? 'text-amber-600' : 'text-red-600'
                )}>{neighborhoodData.airQuality.level} (IQA: {neighborhoodData.airQuality.aqi})</span>} 
              />
            )}
            
            <DataRow label="Espaces verts" value={`${neighborhoodData.greenSpaces.count} à proximité`} />
          </>
        )}
      </PremiumCard>

      {/* 10. CLIMAT */}
      <PremiumCard
        icon={<Cloud className="h-6 w-6" />}
        title="Climat & Météo"
        subtitle={meteoData?.climate ? `${Math.round(meteoData.climate.temperature)}°C actuellement` : 'Conditions locales'}
        status={meteoLoading ? 'loading' : meteoData ? 'success' : 'empty'}
        accentColor="cyan"
      >
        {meteoData?.climate && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <StatCard
                icon={<Thermometer className="h-4 w-4" />}
                label="Température"
                value={`${Math.round(meteoData.climate.temperature)}°C`}
                color="cyan"
              />
              <StatCard
                icon={<Droplets className="h-4 w-4" />}
                label="Humidité"
                value={`${meteoData.climate.humidity}%`}
                color="blue"
              />
              <StatCard
                icon={<Wind className="h-4 w-4" />}
                label="Vent"
                value={`${Math.round(meteoData.climate.windSpeed)} km/h`}
                color="slate"
              />
              <StatCard
                icon={<Sun className="h-4 w-4" />}
                label="Exposition"
                value={meteoData.climate.solarExposure || '—'}
                color="amber"
              />
            </div>
            
            <div className="space-y-1">
              <DataRow label="Précipitations annuelles" value={meteoData.climate.annualPrecipitation ? `${meteoData.climate.annualPrecipitation} mm` : '—'} />
              <DataRow label="Temp. max moyenne" value={meteoData.climate.annualTemperatureMax ? `${meteoData.climate.annualTemperatureMax}°C` : '—'} />
              <DataRow label="Vent dominant" value={meteoData.climate.dominantWindDirection} />
            </div>
          </>
        )}
      </PremiumCard>

      {/* 11. ANALYSE IA */}
      <PremiumCard
        icon={<Bot className="h-6 w-6" />}
        title="Analyse IA du Bâtiment"
        subtitle={aiAnalysis ? `Confiance: ${aiAnalysis.analysis.confidenceScore}%` : 'Diagnostic intelligent'}
        status={aiLoading ? 'loading' : aiAnalysis ? 'success' : 'empty'}
        badge={<Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs">IA</Badge>}
        accentColor="pink"
        defaultOpen={false}
      >
        {!aiAnalysis && !aiLoading && (
          <div className="text-center py-6">
            <Bot className="h-12 w-12 text-pink-500/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Lancez l'analyse IA pour obtenir un diagnostic automatique du bâtiment basé sur les images disponibles.
            </p>
            <Button
              onClick={handleAIAnalysis}
              className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              <Bot className="h-4 w-4" />
              Lancer l'analyse IA
            </Button>
          </div>
        )}
        
        {aiAnalysis && (
          <div className="space-y-4">
            {/* DPE Estimate */}
            <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-2xl">
              <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold", getDPEColor(aiAnalysis.analysis.estimatedDPE))}>
                {aiAnalysis.analysis.estimatedDPE}
              </div>
              <div>
                <p className="font-semibold">DPE Estimé</p>
                <p className="text-xs text-muted-foreground">Basé sur l'analyse visuelle</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-semibold text-sm">{aiAnalysis.analysis.buildingType}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground">Époque</p>
                <p className="font-semibold text-sm">{aiAnalysis.analysis.constructionEra}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground">Étages</p>
                <p className="font-semibold text-sm">{aiAnalysis.analysis.estimatedFloors || '?'}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground">Ascenseur</p>
                <p className="font-semibold text-sm">{aiAnalysis.analysis.hasElevator}</p>
              </div>
            </div>
            
            <DataRow label="Façade" value={aiAnalysis.analysis.facadeMaterial} />
            <DataRow label="État façade" value={<span className={getConditionColor(aiAnalysis.analysis.facadeCondition)}>{aiAnalysis.analysis.facadeCondition}</span>} />
            <DataRow label="Toiture" value={aiAnalysis.analysis.roofType} />
            <DataRow label="Surface façade estimée" value={aiAnalysis.analysis.estimatedFacadeArea ? `${aiAnalysis.analysis.estimatedFacadeArea} m²` : '—'} />
            
            {aiAnalysis.analysis.pathologies.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pathologies détectées</h4>
                <div className="flex flex-wrap gap-2">
                  {aiAnalysis.analysis.pathologies.map((p, i) => (
                    <Badge key={i} variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {aiAnalysis.analysis.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recommandations</h4>
                <ul className="space-y-1">
                  {aiAnalysis.analysis.recommendations.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 gap-2"
              onClick={handleAIAnalysis}
            >
              <RefreshCw className="h-4 w-4" />
              Relancer l'analyse
            </Button>
          </div>
        )}
      </PremiumCard>
    </div>
  );
};

export default PropertyDataSheet;
