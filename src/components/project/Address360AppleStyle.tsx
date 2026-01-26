import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MapPin, FileText, Euro, AlertTriangle, Cloud, Bot, 
  ChevronRight, Loader2, RefreshCw, Users, Building2, Camera,
  CheckCircle, Database, MapPinned, Globe, Filter, Home, Building, Store, User, ExternalLink
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Hooks
import { useGeoData } from '@/hooks/useGeoData';
import { useCadastralData } from '@/hooks/useCadastralData';
import { useGeorisques } from '@/hooks/useGeorisques';
import { useMeteoData } from '@/hooks/useMeteoData';
import { useUrbanContext } from '@/hooks/useUrbanContext';
import { useStreetImagery } from '@/hooks/useStreetImagery';
import { useDVFData } from '@/hooks/useDVFData';
import { useSmartDataFiller } from '@/hooks/useSmartDataFiller';
import { useBuildingAIAnalysis } from '@/hooks/useBuildingAIAnalysis';
import { usePappersData } from '@/hooks/usePappersData';
import { useBDNBData } from '@/hooks/useBDNBData';
import { usePropertyEnrichment } from '@/hooks/usePropertyEnrichment';
import { useNeighborhoodData } from '@/hooks/useNeighborhoodData';
import { DataSourceBadge } from '@/components/location/DataSourceBadge';
import { NeighborhoodMapBlock } from '@/components/location/NeighborhoodMapBlock';
import { UrbanismoBlock } from '@/components/location/UrbanismoBlock';
import { UrbanContextBlock } from '@/components/location/blocks/UrbanContextBlock';
import { UnifiedPropertyMap } from '@/components/location/UnifiedPropertyMap';

interface Address360AppleStyleProps {
  address: string;
  postalCode: string;
  city: string;
  lat?: number;
  lon?: number;
  codeInsee?: string;
  projectId?: string;
  onRefreshStateChange?: (isRefreshing: boolean, refreshFn: () => void) => void;
}

type BlockType = 'carte' | 'cadastre' | 'streetview' | 'risques' | 'contexte' | 'climat' | 'ia' | 'proprietaires' | 'prix' | 'quartier' | 'urbanismo';

interface BlockConfig {
  id: BlockType;
  title: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const BLOCKS: BlockConfig[] = [
  // Carte & Localisation unifié (premier bloc - le plus important)
  { id: 'carte', title: 'Carte & Localisation', icon: <MapPin className="w-6 h-6" />, color: 'text-blue-500', gradient: 'from-blue-500 to-emerald-500' },
  { id: 'urbanismo', title: 'Urbanisme & PLU', icon: <Globe className="w-6 h-6" />, color: 'text-teal-500', gradient: 'from-teal-500 to-cyan-600' },
  { id: 'quartier', title: 'Quartier & POIs', icon: <MapPinned className="w-6 h-6" />, color: 'text-orange-500', gradient: 'from-orange-500 to-amber-500' },
  { id: 'streetview', title: 'Street View', icon: <Camera className="w-6 h-6" />, color: 'text-purple-500', gradient: 'from-purple-500 to-purple-600' },
  // Informations propriété
  { id: 'cadastre', title: 'Cadastre', icon: <FileText className="w-6 h-6" />, color: 'text-amber-500', gradient: 'from-amber-500 to-amber-600' },
  { id: 'proprietaires', title: 'Propriétaires', icon: <Users className="w-6 h-6" />, color: 'text-slate-500', gradient: 'from-slate-500 to-slate-600' },
  { id: 'prix', title: 'Prix du Marché', icon: <Euro className="w-6 h-6" />, color: 'text-green-500', gradient: 'from-green-500 to-green-600' },
  // Environnement & risques
  { id: 'risques', title: 'Risques', icon: <AlertTriangle className="w-6 h-6" />, color: 'text-red-500', gradient: 'from-red-500 to-red-600' },
  { id: 'contexte', title: 'Contexte Urbain', icon: <Building2 className="w-6 h-6" />, color: 'text-indigo-500', gradient: 'from-indigo-500 to-indigo-600' },
  { id: 'climat', title: 'Climat & Météo', icon: <Cloud className="w-6 h-6" />, color: 'text-cyan-500', gradient: 'from-cyan-500 to-cyan-600' },
  // Analyse intelligente (synthèse)
  { id: 'ia', title: 'Analyse IA', icon: <Bot className="w-6 h-6" />, color: 'text-pink-500', gradient: 'from-pink-500 to-pink-600' },
];

export const Address360AppleStyle: React.FC<Address360AppleStyleProps> = ({
  address,
  postalCode,
  city,
  lat,
  lon,
  codeInsee,
  projectId,
  onRefreshStateChange,
}) => {
  const [activeSheet, setActiveSheet] = useState<BlockType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedData, setCachedData] = useState<Record<string, any> | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  
  // DVF Filters state
  const [dvfTypeFilter, setDvfTypeFilter] = useState<string>('all');
  const [dvfRoomsFilter, setDvfRoomsFilter] = useState<string>('all');
  const [dvfYearFilter, setDvfYearFilter] = useState<string>('all');

  // All hooks
  const { geoData: fetchedGeoData, isLoading: geoLoading, fetchGeoData } = useGeoData();
  const { cadastralData: fetchedCadastralData, isLoading: cadastralLoading, fetchCadastralData } = useCadastralData();
  const { riskData: fetchedRiskData, isLoading: riskLoading, fetchRiskData } = useGeorisques();
  const { meteoData: fetchedMeteoData, isLoading: meteoLoading, fetchMeteoData } = useMeteoData();
  const { urbanData: fetchedUrbanData, isLoading: urbanLoading, fetchUrbanContext } = useUrbanContext();
  const { data: fetchedStreetImageryData, isLoading: streetImageryLoading, fetchImages: fetchStreetImages } = useStreetImagery();
  const { dvfData: fetchedDvfData, isLoading: dvfLoading, fetchDVFData } = useDVFData();
  const { aiAnalysis: fetchedAiAnalysis, isLoading: aiLoading, analyzeBuilding } = useBuildingAIAnalysis();
  const { data: fetchedPappersData, isLoading: pappersLoading, fetchPropertyOwners } = usePappersData();
  const { data: fetchedBdnbData, isLoading: bdnbLoading, fetchBDNBData } = useBDNBData();
  const { data: fetchedEnrichmentData, isLoading: enrichmentLoading, enrichProperty } = usePropertyEnrichment();
  const { neighborhoodData: fetchedNeighborhoodData, isLoading: neighborhoodLoading, fetchNeighborhoodData } = useNeighborhoodData();
  const { isAnalyzing: isSmartFilling, analyzeAndFill, lastResult: smartFillerResult } = useSmartDataFiller();

  // Use cached data or fetched data
  const geoData = cachedData?.geoData || fetchedGeoData;
  const cadastralData = cachedData?.cadastralData || fetchedCadastralData;
  const riskData = cachedData?.riskData || fetchedRiskData;
  const meteoData = cachedData?.meteoData || fetchedMeteoData;
  const urbanData = cachedData?.urbanData || fetchedUrbanData;
  const streetImageryData = cachedData?.streetImageryData || fetchedStreetImageryData;
  const dvfData = cachedData?.dvfData || fetchedDvfData;
  const aiAnalysis = cachedData?.aiAnalysis || fetchedAiAnalysis;
  const pappersData = cachedData?.pappersData || fetchedPappersData;
  const bdnbData = cachedData?.bdnbData || fetchedBdnbData;
  const enrichmentData = cachedData?.enrichmentData || fetchedEnrichmentData;
  const neighborhoodData = cachedData?.neighborhoodData || fetchedNeighborhoodData;

  const hasCoordinates = lat !== undefined && lon !== undefined;
  const [smartFillerData, setSmartFillerData] = useState<Record<string, any>>({});

  // Load cached enrichment data from project
  useEffect(() => {
    if (!projectId) {
      setIsLoadingCache(false);
      return;
    }
    
    const loadCachedData = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('enrichment_data')
          .eq('id', projectId)
          .single();
        
        if (data?.enrichment_data && Object.keys(data.enrichment_data as object).length > 0) {
          setCachedData(data.enrichment_data as Record<string, any>);
        }
      } catch (err) {
        console.error('Error loading cached enrichment data:', err);
      } finally {
        setIsLoadingCache(false);
      }
    };
    
    loadCachedData();
  }, [projectId]);

  // Save enrichment data to project when data changes
  const saveEnrichmentData = useCallback(async (dataToSave: Record<string, any>) => {
    if (!projectId) return;
    
    try {
      await supabase
        .from('projects')
        .update({ enrichment_data: dataToSave as any })
        .eq('id', projectId);
      console.log('Enrichment data saved successfully');
    } catch (err) {
      console.error('Error saving enrichment data:', err);
    }
  }, [projectId]);

  // Auto-save when data changes - merge with existing cached data
  useEffect(() => {
    if (!projectId || isLoadingCache) return;
    
    // Check if we have any new fetched data to save
    const hasNewFetchedData = fetchedGeoData || fetchedCadastralData || fetchedRiskData || 
                    fetchedMeteoData || fetchedUrbanData || fetchedStreetImageryData ||
                    fetchedDvfData || fetchedPappersData || fetchedBdnbData ||
                    fetchedEnrichmentData || fetchedNeighborhoodData || fetchedAiAnalysis;
    
    if (!hasNewFetchedData) return;
    
    // Merge new fetched data with existing cached data
    const dataToSave = {
      geoData: fetchedGeoData || cachedData?.geoData,
      cadastralData: fetchedCadastralData || cachedData?.cadastralData,
      riskData: fetchedRiskData || cachedData?.riskData,
      meteoData: fetchedMeteoData || cachedData?.meteoData,
      urbanData: fetchedUrbanData || cachedData?.urbanData,
      streetImageryData: fetchedStreetImageryData || cachedData?.streetImageryData,
      dvfData: fetchedDvfData || cachedData?.dvfData,
      pappersData: fetchedPappersData || cachedData?.pappersData,
      bdnbData: fetchedBdnbData || cachedData?.bdnbData,
      enrichmentData: fetchedEnrichmentData || cachedData?.enrichmentData,
      neighborhoodData: fetchedNeighborhoodData || cachedData?.neighborhoodData,
      aiAnalysis: fetchedAiAnalysis || cachedData?.aiAnalysis,
      lastUpdated: new Date().toISOString()
    };
    
    // Debounce save to avoid too many updates
    const timeoutId = setTimeout(() => {
      saveEnrichmentData(dataToSave);
      // Update local cache state to reflect saved data
      setCachedData(dataToSave);
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [projectId, isLoadingCache, fetchedGeoData, fetchedCadastralData, fetchedRiskData, fetchedMeteoData, fetchedUrbanData, fetchedStreetImageryData, fetchedDvfData, fetchedPappersData, fetchedBdnbData, fetchedEnrichmentData, fetchedNeighborhoodData, fetchedAiAnalysis, saveEnrichmentData]);

  // Load all data from APIs (only if not cached)
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
        fetchPropertyOwners(`${address}, ${postalCode} ${city}`, lat!, lon!),
        fetchBDNBData(lat!, lon!, `${address}, ${postalCode} ${city}`),
        fetchNeighborhoodData(lat!, lon!),
        enrichProperty({
          address: `${address}, ${postalCode} ${city}`,
          latitude: lat!,
          longitude: lon!,
        }),
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [lat, lon, codeInsee, hasCoordinates, address, postalCode, city, enrichProperty, fetchNeighborhoodData, fetchGeoData, fetchCadastralData, fetchRiskData, fetchMeteoData, fetchUrbanContext, fetchStreetImages, fetchDVFData, fetchPropertyOwners, fetchBDNBData]);

  // Automatic smart data filling after initial load
  useEffect(() => {
    const runSmartFiller = async () => {
      if (!hasCoordinates || isRefreshing || isSmartFilling) return;
      
      await new Promise(r => setTimeout(r, 2000));
      
      const allData = {
        geoData,
        cadastralData,
        riskData,
        meteoData,
        urbanData,
        streetImageryData,
        dvfData,
        pappersData,
        bdnbData,
        enrichmentData,
        neighborhoodData
      };
      
      const result = await analyzeAndFill(
        allData,
        lat!,
        lon!,
        `${address}, ${postalCode} ${city}`,
        codeInsee
      );
      
      if (result?.filledData) {
        setSmartFillerData(result.filledData);
      }
    };

    if (!isRefreshing && hasCoordinates && (geoData || cadastralData || riskData)) {
      runSmartFiller();
    }
  }, [isRefreshing, hasCoordinates, geoData, cadastralData, riskData]);

  // Load data only if cache is empty and loading is complete
  useEffect(() => {
    if (hasCoordinates && !isLoadingCache && !cachedData) {
      loadAllData();
    }
  }, [hasCoordinates, isLoadingCache, cachedData]);

  // Trigger AI analysis automatically when coordinates available
  useEffect(() => {
    if (hasCoordinates && !aiAnalysis && !aiLoading) {
      const imageUrl = streetImageryData?.closestImage?.fullUrl || streetImageryData?.closestImage?.thumbnailUrl;
      analyzeBuilding(lat!, lon!, `${address}, ${postalCode} ${city}`, imageUrl);
    }
  }, [hasCoordinates, aiAnalysis, aiLoading, lat, lon]);

  // Manual trigger for AI analysis
  const triggerAIAnalysis = useCallback(() => {
    if (hasCoordinates) {
      const imageUrl = streetImageryData?.closestImage?.fullUrl || streetImageryData?.closestImage?.thumbnailUrl;
      analyzeBuilding(lat!, lon!, `${address}, ${postalCode} ${city}`, imageUrl);
    }
  }, [hasCoordinates, lat, lon, address, postalCode, city, streetImageryData, analyzeBuilding]);

  const getBlockStatus = (blockId: BlockType): 'loading' | 'success' | 'empty' => {
    switch (blockId) {
      case 'carte': return geoLoading ? 'loading' : geoData ? 'success' : 'empty';
      case 'cadastre': return cadastralLoading ? 'loading' : cadastralData?.parcels?.length ? 'success' : 'empty';
      case 'streetview': return streetImageryLoading ? 'loading' : streetImageryData?.closestImage ? 'success' : 'empty';
      case 'risques': return riskLoading ? 'loading' : riskData ? 'success' : 'empty';
      case 'contexte': return (urbanLoading || bdnbLoading) ? 'loading' : (urbanData || bdnbData) ? 'success' : 'empty';
      case 'climat': return meteoLoading ? 'loading' : meteoData ? 'success' : 'empty';
      case 'ia': return aiLoading ? 'loading' : aiAnalysis ? 'success' : 'empty';
      case 'proprietaires': return pappersLoading ? 'loading' : pappersData ? 'success' : 'empty';
      case 'prix': return dvfLoading ? 'loading' : dvfData?.stats ? 'success' : 'empty';
      case 'quartier': return 'success';
      case 'urbanismo': return enrichmentLoading ? 'loading' : enrichmentData?.urbanism ? 'success' : 'empty';
      default: return 'empty';
    }
  };

  const getBlockSubtitle = (blockId: BlockType): string => {
    switch (blockId) {
      case 'carte': return geoData ? `✓ BAN • ${geoData.departement || 'France'}` : 'GPS, commune & vues';
      case 'quartier': return 'Commerces, transports, écoles...';
      case 'urbanismo': return enrichmentData?.urbanism ? '✓ GPU • PLU/RNU' : 'Documents d\'urbanisme';
      case 'cadastre': return cadastralData?.parcels?.[0] ? `✓ IGN • ${cadastralData.parcels[0].section}-${cadastralData.parcels[0].numero}` : 'Références';
      case 'streetview': return streetImageryData?.closestImage ? `✓ ${streetImageryData.source}` : 'Street View';
      case 'risques': return riskData ? `✓ Géorisques • ${Object.values(riskData.risks?.naturels || {}).filter(Boolean).length} risques` : 'Risques';
      case 'contexte': return bdnbData ? `✓ BDNB • ${bdnbData.nb_etage || '?'} étages` : (urbanData?.data ? '✓ OSM' : 'Bâtiment');
      case 'climat': return meteoData?.climate ? `✓ Open-Meteo • ${meteoData.climate.temperature}°C` : 'Météo';
      case 'ia': return aiAnalysis?.analysis ? `✓ ${aiAnalysis.analysis.lotsDataSource === 'bdnb' ? 'BDNB+IA' : 'IA'}` : 'Analyse IA';
      case 'proprietaires': return pappersData ? '✓ Pappers' : 'Propriétaires';
      case 'prix': return dvfData?.stats ? `✓ DVF • ${dvfData.stats.totalTransactions} ventes` : 'Prix marché';
      default: return '';
    }
  };

  if (!hasCoordinates) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <MapPin className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Adresse 360°</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Complétez l'adresse à l'étape précédente pour débloquer les données enrichies.
        </p>
      </div>
    );
  }

  // Expose refresh state to parent
  useEffect(() => {
    if (onRefreshStateChange) {
      onRefreshStateChange(isRefreshing, loadAllData);
    }
  }, [isRefreshing, loadAllData, onRefreshStateChange]);

  return (
    <div className="space-y-4">
      {/* Apple-style Block Grid */}
      <div className="grid grid-cols-2 gap-3">
        {BLOCKS.map((block) => {
          const status = getBlockStatus(block.id);
          const subtitle = getBlockSubtitle(block.id);
          
          return (
            <button
              key={block.id}
              onClick={() => setActiveSheet(block.id)}
              className="flex flex-col p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-accent/30 hover:shadow-md transition-all duration-200 active:scale-[0.98] text-left min-h-[100px]"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md",
                  block.gradient
                )}>
                  {status === 'loading' ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <span className="text-white">{block.icon}</span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base text-foreground leading-tight mb-1">{block.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sheets for each block - z-[100] to appear above dialog */}
      {BLOCKS.map((block) => (
        <Sheet key={block.id} open={activeSheet === block.id} onOpenChange={(open) => !open && setActiveSheet(null)}>
          <SheetContent 
            side="bottom" 
            className="h-[85vh] rounded-t-[20px] p-0 flex flex-col z-[100]"
            overlayClassName="z-[99]"
          >
            {/* iOS Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-9 h-1 bg-muted-foreground/40 rounded-full" />
            </div>
            
            <SheetHeader className="px-5 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                  block.gradient
                )}>
                  <span className="text-white">{block.icon}</span>
                </div>
                <div>
                  <SheetTitle className="text-lg font-semibold">{block.title}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{getBlockSubtitle(block.id)}</p>
                </div>
              </div>
            </SheetHeader>
            
            <ScrollArea className="flex-1">
              <div className="px-5 pb-8">
                {/* Block-specific content */}
                {block.id === 'carte' && (
                  <UnifiedPropertyMap
                    latitude={lat!}
                    longitude={lon!}
                    address={address}
                    postalCode={postalCode}
                    city={city}
                    zoom={18}
                    geoData={geoData}
                    codeInsee={codeInsee}
                    cadastralSection={cadastralData?.parcels?.[0]?.section}
                    cadastralNumero={cadastralData?.parcels?.[0]?.numero}
                  />
                )}

                {block.id === 'quartier' && (
                  <NeighborhoodMapBlock 
                    latitude={lat!}
                    longitude={lon!}
                    address={`${address}, ${postalCode} ${city}`}
                    smartFillerData={smartFillerData}
                  />
                )}

                {block.id === 'urbanismo' && (
                  <UrbanismoBlock 
                    latitude={lat!}
                    longitude={lon!}
                    address={`${address}, ${postalCode} ${city}`}
                    bdnbData={bdnbData}
                    aiAnalysis={aiAnalysis?.analysis}
                    urbanismData={enrichmentData?.urbanism}
                    neighborhoodData={neighborhoodData}
                  />
                )}

                {block.id === 'cadastre' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg mb-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Source: API Carto IGN (officiel)
                      </span>
                    </div>
                    <div className="rounded-2xl overflow-hidden border h-48 mb-4">
                      <iframe
                        src={`https://cadastre.data.gouv.fr/map#18/${lat}/${lon}`}
                        className="w-full h-full"
                        title="Plan cadastral"
                      />
                    </div>
                    {cadastralData?.parcels?.[0] && (
                      <DataList source="API Carto IGN" items={[
                        { label: 'Section', value: cadastralData.parcels[0].section, isOfficial: true },
                        { label: 'Numéro', value: cadastralData.parcels[0].numero, isOfficial: true },
                        { label: 'Surface', value: cadastralData.parcels[0].contenance ? `${cadastralData.parcels[0].contenance.toLocaleString('fr-FR')} m²` : '—', isOfficial: true },
                        { label: 'Commune', value: cadastralData.communeName, isOfficial: true },
                      ]} />
                    )}
                  </div>
                )}

                {block.id === 'streetview' && (
                  <div className="space-y-4">
                    {streetImageryData?.closestImage ? (
                      <>
                        <div className="rounded-2xl overflow-hidden border">
                          <img 
                            src={streetImageryData.closestImage.fullUrl || streetImageryData.closestImage.thumbnailUrl} 
                            alt="Street View" 
                            className="w-full h-64 object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {streetImageryData.source}
                          </Badge>
                          {streetImageryData.closestImage.capturedAt && (
                            <span className="text-sm text-muted-foreground">
                              {new Date(streetImageryData.closestImage.capturedAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                          {streetImageryData.fallbackUsed && (
                            <Badge variant="secondary" className="text-xs">
                              Auto-fallback
                            </Badge>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Recherche d'images...</p>
                        <p className="text-xs mt-1">Panoramax → KartaView → Wikimedia</p>
                      </div>
                    )}
                  </div>
                )}

                {block.id === 'risques' && (
                  <div className="space-y-4">
                    {(() => {
                      const mergedRisks = riskData?.risks || smartFillerData?.risks?.data;
                      if (!mergedRisks) return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Données de risques non disponibles</p>
                          {isSmartFilling && <p className="text-xs mt-1">Recherche en cours...</p>}
                        </div>
                      );
                      return (
                        <>
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Risques naturels</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {mergedRisks.naturels && Object.entries(mergedRisks.naturels).map(([key, value]) => (
                                <div key={key} className={cn(
                                  "p-3 rounded-xl text-sm",
                                  value ? "bg-red-500/10 text-red-600" : "bg-muted/50 text-muted-foreground"
                                )}>
                                  {key}: {value ? '⚠️ Oui' : 'Non'}
                                </div>
                              ))}
                            </div>
                          </div>
                          {mergedRisks.technologiques && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Risques technologiques</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(mergedRisks.technologiques).map(([key, value]) => (
                                  <div key={key} className={cn(
                                    "p-3 rounded-xl text-sm",
                                    value ? "bg-orange-500/10 text-orange-600" : "bg-muted/50 text-muted-foreground"
                                  )}>
                                    {key}: {value ? '⚠️ Oui' : 'Non'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {smartFillerData?.risks && !riskData?.risks && (
                            <Badge variant="secondary" className="text-xs">Source: {smartFillerData.risks.source}</Badge>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {block.id === 'contexte' && (
                  <UrbanContextBlock 
                    urbanData={urbanData}
                    neighborhoodData={neighborhoodData}
                    isLoading={urbanLoading || neighborhoodLoading}
                    smartFillerData={smartFillerData}
                  />
                )}

                {block.id === 'climat' && (
                  <div className="space-y-4">
                    {(() => {
                      const climate = meteoData?.climate || smartFillerData?.climate?.data?.current_weather;
                      if (!climate) return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Données climatiques non disponibles</p>
                          {isSmartFilling && <p className="text-xs mt-1">Recherche en cours...</p>}
                        </div>
                      );
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <StatBox label="Température" value={`${climate.temperature || climate.windspeed || '—'}°C`} />
                            <StatBox label="Humidité" value={climate.humidity ? `${climate.humidity}%` : '—'} />
                            <StatBox label="Vent" value={climate.windSpeed || climate.windspeed ? `${climate.windSpeed || climate.windspeed} km/h` : '—'} />
                            <StatBox label="Précipitations" value={climate.precipitation !== undefined ? `${climate.precipitation} mm` : '—'} />
                          </div>
                          {smartFillerData?.climate && !meteoData?.climate && (
                            <Badge variant="secondary" className="text-xs">Source: {smartFillerData.climate.source}</Badge>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {block.id === 'ia' && (
                  <div className="space-y-4">
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-pink-500 mb-4" />
                        <p className="text-sm text-muted-foreground">Analyse IA en cours...</p>
                      </div>
                    ) : aiAnalysis?.analysis ? (
                      <>
                        {/* Confiance */}
                        {aiAnalysis.analysis.confidenceScore && (
                          <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl">
                            <span className="text-sm font-medium">Confiance de l'analyse</span>
                            <Badge variant="secondary" className="bg-emerald-500 text-white">
                              {Math.round(aiAnalysis.analysis.confidenceScore * 100)}%
                            </Badge>
                          </div>
                        )}
                        
                        {/* Identification */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identification</h4>
                          <DataList items={[
                            { label: 'Type de bâtiment', value: aiAnalysis.analysis.buildingType },
                            { label: 'Époque de construction', value: aiAnalysis.analysis.constructionEra },
                            { label: 'Nombre d\'étages', value: aiAnalysis.analysis.estimatedFloors },
                            { label: 'Ascenseur', value: aiAnalysis.analysis.hasElevator },
                          ]} />
                        </div>

                        {/* DPE */}
                        {aiAnalysis.analysis.estimatedDPE && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance énergétique</h4>
                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                                aiAnalysis.analysis.estimatedDPE === 'A' ? 'bg-green-500' :
                                aiAnalysis.analysis.estimatedDPE === 'B' ? 'bg-lime-500' :
                                aiAnalysis.analysis.estimatedDPE === 'C' ? 'bg-yellow-400' :
                                aiAnalysis.analysis.estimatedDPE === 'D' ? 'bg-amber-500' :
                                aiAnalysis.analysis.estimatedDPE === 'E' ? 'bg-orange-500' :
                                aiAnalysis.analysis.estimatedDPE === 'F' ? 'bg-red-500' : 'bg-red-700'
                              )}>
                                {aiAnalysis.analysis.estimatedDPE}
                              </div>
                              <div>
                                <p className="font-medium">DPE estimé : {aiAnalysis.analysis.estimatedDPE}</p>
                                <p className="text-xs text-muted-foreground">Basé sur l'époque et le type</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Façade */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Façade</h4>
                          <DataList items={[
                            { label: 'Matériau', value: aiAnalysis.analysis.facadeMaterial },
                            { label: 'État', value: aiAnalysis.analysis.facadeCondition },
                            { label: 'Surface estimée', value: aiAnalysis.analysis.estimatedFacadeArea ? `~${aiAnalysis.analysis.estimatedFacadeArea} m²` : null },
                          ]} />
                        </div>

                        {/* Toiture */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toiture</h4>
                          <DataList items={[
                            { label: 'Type', value: aiAnalysis.analysis.roofType },
                            { label: 'État', value: aiAnalysis.analysis.roofCondition },
                          ]} />
                        </div>

                        {/* Urbanisme & Réglementaire */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Urbanisme & Réglementaire</h4>
                          <DataList items={[
                            { label: 'Arrêté de péril', value: aiAnalysis.analysis.arretePéril },
                            { label: 'PC/DP historiques', value: aiAnalysis.analysis.permisConstructionHistorique },
                            { label: 'Travaux récents', value: aiAnalysis.analysis.travauxRecentsProbables },
                            { label: 'Zone PLU', value: aiAnalysis.analysis.zonePLU },
                          ]} />
                        </div>

                        {/* Lots & Destination */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lots & Destination</h4>
                            {aiAnalysis.analysis.lotsDataSource === 'bdnb' || aiAnalysis.analysis.lotsDataSource === 'rnc' ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                ✓ Données officielles {aiAnalysis.analysis.lotsDataSource === 'rnc' ? 'RNC' : 'BDNB'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                Estimation
                              </Badge>
                            )}
                          </div>
                          {aiAnalysis.analysis.lotsDataSource !== 'bdnb' && aiAnalysis.analysis.lotsDataSource !== 'rnc' && (
                            <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg mb-2">
                              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                Données BDNB non disponibles pour ce bâtiment. Vérifiez auprès du syndic ou du notaire.
                              </p>
                            </div>
                          )}
                          {aiAnalysis.analysis.bdnbId && (
                            <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg mb-2">
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                Source: Base de Données Nationale des Bâtiments (BDNB) - ID: {aiAnalysis.analysis.bdnbId}
                              </p>
                            </div>
                          )}
                          <DataList items={[
                            { label: 'Destination du bien', value: aiAnalysis.analysis.destinationBien?.toString() },
                            { label: 'Total lots', value: aiAnalysis.analysis.totalLots?.toString() },
                            { label: 'Lots appartements', value: aiAnalysis.analysis.lotsAppartements?.toString() },
                            { label: 'Lots garages', value: aiAnalysis.analysis.lotsGarages?.toString() },
                            { label: 'Lots annexes', value: aiAnalysis.analysis.lotsAnnexes?.toString() },
                            { label: 'Lots commerces', value: aiAnalysis.analysis.lotsCommerces?.toString() },
                          ]} />
                        </div>

                        {/* Pathologies */}
                        {aiAnalysis.analysis.pathologies && aiAnalysis.analysis.pathologies.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pathologies détectées</h4>
                            <div className="space-y-2">
                              {aiAnalysis.analysis.pathologies.map((p: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm">{p}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommandations */}
                        {aiAnalysis.analysis.recommendations && aiAnalysis.analysis.recommendations.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommandations</h4>
                            <div className="space-y-2">
                              {aiAnalysis.analysis.recommendations.map((r: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                  <Bot className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm">{r}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={triggerAIAnalysis}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Relancer l'analyse
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">L'analyse n'a pas pu être effectuée</p>
                        <Button 
                          onClick={triggerAIAnalysis}
                          className="bg-gradient-to-r from-pink-500 to-pink-600"
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Lancer l'analyse IA
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {block.id === 'proprietaires' && (
                  <div className="space-y-4">
                    {pappersData?.data_source === 'pappers' && pappersData.pappers_entreprise ? (
                      <>
                        {/* Données Pappers réelles */}
                        <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-5 w-5 text-blue-500" />
                            <span className="font-semibold text-base">
                              {pappersData.pappers_entreprise.denomination || 'Propriétaire'}
                            </span>
                            <Badge variant="outline" className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pappers
                            </Badge>
                          </div>
                          
                          <div className="ml-7 space-y-1.5 text-sm">
                            <p className="text-muted-foreground">
                              <span className="text-foreground font-medium">Forme juridique:</span> {pappersData.pappers_entreprise.forme_juridique || '—'}
                            </p>
                            {pappersData.pappers_entreprise.siren && (
                              <p className="text-muted-foreground">
                                <span className="text-foreground font-medium">SIREN:</span> {pappersData.pappers_entreprise.siren}
                              </p>
                            )}
                          </div>
                          
                          {pappersData.pappers_entreprise.siege && (
                            <div className="ml-7 mt-3 pt-3 border-t border-border/30 text-sm">
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <span>
                                  {`${pappersData.pappers_entreprise.siege.adresse_ligne_1}, ${pappersData.pappers_entreprise.siege.code_postal} ${pappersData.pappers_entreprise.siege.ville}`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/30">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground mb-1">
                              Données propriétaires non disponibles
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                              Les informations sur les propriétaires nécessitent un accès à l'API Pappers Immobilier.
                            </p>
                            <a 
                              href="https://www.pappers.fr/api" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              En savoir plus sur Pappers
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

{block.id === 'prix' && (
                  <div className="space-y-4">
                    {dvfLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-green-500 mb-4" />
                        <p className="text-sm text-muted-foreground">Recherche des transactions DVF...</p>
                      </div>
                    ) : dvfData?.stats ? (
                      <>
                        <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg mb-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Source: DVF • {dvfData.stats.totalTransactions} transactions
                          </span>
                        </div>
                        
                        {/* Filtres intelligents */}
                        <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Filter className="w-4 h-4" />
                            <span>Filtres</span>
                          </div>
                          
                          {/* Type de bien */}
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'all', label: 'Tous', icon: null },
                              { value: 'appartement', label: 'Appart', icon: <Building className="w-3 h-3" /> },
                              { value: 'maison', label: 'Maison', icon: <Home className="w-3 h-3" /> },
                              { value: 'local', label: 'Local', icon: <Store className="w-3 h-3" /> },
                            ].map((type) => (
                              <button
                                key={type.value}
                                onClick={() => setDvfTypeFilter(type.value)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                  dvfTypeFilter === type.value
                                    ? "bg-green-500 text-white shadow-md"
                                    : "bg-background border border-border hover:border-green-300"
                                )}
                              >
                                {type.icon}
                                {type.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* Nombre de pièces & Année */}
                          <div className="flex gap-2">
                            <Select value={dvfRoomsFilter} onValueChange={setDvfRoomsFilter}>
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder="Pièces" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Toutes pièces</SelectItem>
                                <SelectItem value="1">1 pièce</SelectItem>
                                <SelectItem value="2">2 pièces</SelectItem>
                                <SelectItem value="3">3 pièces</SelectItem>
                                <SelectItem value="4">4 pièces</SelectItem>
                                <SelectItem value="5+">5+ pièces</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Select value={dvfYearFilter} onValueChange={setDvfYearFilter}>
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder="Année" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Toutes années</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2023">2023</SelectItem>
                                <SelectItem value="2022">2022</SelectItem>
                                <SelectItem value="2021">2021</SelectItem>
                                <SelectItem value="2020">2020</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Statistiques filtrées */}
                        {(() => {
                          const filteredTransactions = dvfData.stats.nearbyTransactions.filter(t => {
                            // Filter by type - handle various DVF type names
                            if (dvfTypeFilter !== 'all') {
                              const typeLocal = (t.type_local || '').toLowerCase();
                              if (dvfTypeFilter === 'appartement' && !typeLocal.includes('appartement')) return false;
                              if (dvfTypeFilter === 'maison' && !typeLocal.includes('maison')) return false;
                              if (dvfTypeFilter === 'local' && !typeLocal.includes('local') && !typeLocal.includes('commercial') && !typeLocal.includes('industriel')) return false;
                            }
                            // Filter by rooms - only apply if rooms filter is not 'all' AND transaction has room data
                            if (dvfRoomsFilter !== 'all') {
                              const rooms = t.nombre_pieces_principales || 0;
                              // Skip transactions without room data when filtering by rooms
                              if (rooms === 0) return false;
                              if (dvfRoomsFilter === '5+') {
                                if (rooms < 5) return false;
                              } else {
                                if (rooms !== parseInt(dvfRoomsFilter)) return false;
                              }
                            }
                            // Filter by year
                            if (dvfYearFilter !== 'all' && t.date_mutation) {
                              const year = new Date(t.date_mutation).getFullYear().toString();
                              if (year !== dvfYearFilter) return false;
                            }
                            // Filter out transactions with invalid price data
                            if (!t.valeur_fonciere || t.valeur_fonciere <= 0) return false;
                            return true;
                          });

                          const avgPriceM2 = filteredTransactions.length > 0
                            ? Math.round(filteredTransactions.reduce((sum, t) => sum + t.prix_m2, 0) / filteredTransactions.length)
                            : 0;

                          return (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <StatBox 
                                  label="Prix/m² moyen" 
                                  value={avgPriceM2 ? `${avgPriceM2.toLocaleString('fr-FR')} €` : '—'} 
                                />
                                <StatBox 
                                  label="Transactions" 
                                  value={filteredTransactions.length.toString()} 
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center justify-between">
                                  <span>Transactions récentes</span>
                                  {(dvfTypeFilter !== 'all' || dvfRoomsFilter !== 'all' || dvfYearFilter !== 'all') && (
                                    <button 
                                      onClick={() => {
                                        setDvfTypeFilter('all');
                                        setDvfRoomsFilter('all');
                                        setDvfYearFilter('all');
                                      }}
                                      className="text-xs text-green-600 hover:underline"
                                    >
                                      Réinitialiser filtres
                                    </button>
                                  )}
                                </h4>
                                {filteredTransactions.length > 0 ? (
                                  filteredTransactions.slice(0, 8).map((t, i) => (
                                    <div key={i} className="p-3 bg-background rounded-xl text-sm border border-border/50">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="font-medium">{t.type_local || 'Bien'}</span>
                                          {t.nombre_pieces_principales > 0 && (
                                            <span className="text-muted-foreground ml-1">• {t.nombre_pieces_principales}p</span>
                                          )}
                                        </div>
                                        <span className="font-semibold text-green-600">{t.valeur_fonciere.toLocaleString('fr-FR')} €</span>
                                      </div>
                                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>
                                          {t.surface_reelle_bati || t.surface_terrain || '—'} m² 
                                          {t.prix_m2 > 0 && ` • ${t.prix_m2.toLocaleString('fr-FR')} €/m²`}
                                        </span>
                                        <span>{t.date_mutation ? new Date(t.date_mutation).toLocaleDateString('fr-FR') : '—'}</span>
                                      </div>
                                      {t.adresse_nom_voie && (
                                        <div className="text-xs text-muted-foreground mt-1 truncate">
                                          {t.adresse_numero} {t.adresse_nom_voie}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Aucune transaction correspondant aux filtres
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                          <Euro className="h-8 w-8 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">Données non disponibles</p>
                        <p className="text-xs text-muted-foreground max-w-[250px]">
                          Aucune transaction immobilière trouvée. 
                          Les données DVF couvrent les 5 dernières années.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => fetchDVFData(lat!, lon!, codeInsee)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Réessayer
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
};

// Helper components
const DataList: React.FC<{ 
  items: { label: string; value?: string | number | null; source?: string; isOfficial?: boolean }[];
  source?: string;
}> = ({ items, source }) => (
  <div className="bg-card rounded-2xl border divide-y">
    {source && (
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <span className="text-xs text-muted-foreground">Source des données</span>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">{source}</span>
        </div>
      </div>
    )}
    {items.map((item, i) => (
      <div key={i} className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-muted-foreground">{item.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.value || '—'}</span>
          {item.isOfficial && (
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          )}
        </div>
      </div>
    ))}
  </div>
);

const StatBox: React.FC<{ label: string; value: string; source?: string }> = ({ label, value, source }) => (
  <div className="p-4 bg-muted/30 rounded-2xl text-center relative">
    {source && (
      <div className="absolute top-1 right-1">
        <CheckCircle className="w-3 h-3 text-emerald-500" />
      </div>
    )}
    <p className="text-xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default Address360AppleStyle;
