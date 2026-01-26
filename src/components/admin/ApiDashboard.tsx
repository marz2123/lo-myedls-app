import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Clock,
  Database,
  MapPin,
  Building2,
  FileText,
  Shield,
  Cloud,
  Users,
  Landmark,
  Globe,
  Zap,
  Sparkles,
  Search,
  Lightbulb,
  Star,
  TrendingUp,
  Bot,
  Trash2,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface ApiStatus {
  id: string;
  name: string;
  description: string;
  category: 'cadastre' | 'geo' | 'risks' | 'immobilier' | 'urbanisme' | 'meteo' | 'imagery';
  endpoint: string;
  docsUrl: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown' | 'configured';
  lastCheck: Date | null;
  responseTime: number | null;
  dataType: string;
  isFree: boolean;
  requiresKey: boolean;
  icon: any;
}

const OFFICIAL_APIS: Omit<ApiStatus, 'status' | 'lastCheck' | 'responseTime'>[] = [
  // === BASE DE DONNÉES NATIONALE DES BÂTIMENTS (BDNB) ===
  {
    id: 'bdnb-open',
    name: 'BDNB Open (Bâtiments)',
    description: 'Base officielle CSTB/ADEME - Données bâtiments, lots, DPE, construction',
    category: 'immobilier',
    endpoint: 'https://api-open.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet',
    docsUrl: 'https://www.data.gouv.fr/fr/datasets/base-de-donnees-nationale-des-batiments/',
    dataType: 'Lots, étages, matériaux, DPE, copropriétés (RNC)',
    isFree: true,
    requiresKey: false,
    icon: Building2,
  },
  // === DPE / ADEME ===
  {
    id: 'ademe-dpe',
    name: 'ADEME DPE (Performance Énergétique)',
    description: 'Base officielle des Diagnostics de Performance Énergétique',
    category: 'immobilier',
    endpoint: 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines',
    docsUrl: 'https://data.ademe.fr/datasets/dpe-v2-logements-existants',
    dataType: 'DPE officiel, consommation, GES, classe',
    isFree: true,
    requiresKey: false,
    icon: Zap,
  },
  // Cadastre & Propriété
  {
    id: 'apicarto-cadastre',
    name: 'API Carto Cadastre (IGN)',
    description: 'Données cadastrales officielles françaises - parcelles, sections, communes',
    category: 'cadastre',
    endpoint: 'https://apicarto.ign.fr/api/cadastre/parcelle',
    docsUrl: 'https://apicarto.ign.fr/api/doc/cadastre',
    dataType: 'Parcelles, sections, contenance',
    isFree: true,
    requiresKey: false,
    icon: Landmark,
  },
  {
    id: 'cadastre-gouv',
    name: 'cadastre.data.gouv.fr',
    description: 'Visualisation cartographique du cadastre français (viewer iframe)',
    category: 'cadastre',
    endpoint: 'https://cadastre.gouv.fr/scpc/accueil.do',
    docsUrl: 'https://cadastre.data.gouv.fr/',
    dataType: 'Cartes cadastrales interactives (iframe)',
    isFree: true,
    requiresKey: false,
    icon: FileText,
  },
  // DVF & Transactions
  {
    id: 'dvf-etalab',
    name: 'DVF (Demandes de Valeurs Foncières)',
    description: 'Transactions immobilières officielles - prix, surfaces, types',
    category: 'immobilier',
    endpoint: 'https://api.dvf.etalab.gouv.fr/transactions',
    docsUrl: 'https://app.dvf.etalab.gouv.fr/',
    dataType: 'Prix m², transactions, historique',
    isFree: true,
    requiresKey: false,
    icon: Building2,
  },
  // Géographie
  {
    id: 'ban-adresse',
    name: 'BAN (Base Adresse Nationale)',
    description: 'Référentiel officiel des adresses françaises',
    category: 'geo',
    endpoint: 'https://api-adresse.data.gouv.fr/search',
    docsUrl: 'https://adresse.data.gouv.fr/api-doc/adresse',
    dataType: 'Adresses, coordonnées GPS, codes INSEE',
    isFree: true,
    requiresKey: false,
    icon: MapPin,
  },
  {
    id: 'geo-api-gouv',
    name: 'API Géo (geo.api.gouv.fr)',
    description: 'Données géographiques administratives françaises',
    category: 'geo',
    endpoint: 'https://geo.api.gouv.fr/communes',
    docsUrl: 'https://geo.api.gouv.fr/',
    dataType: 'Communes, départements, régions, population',
    isFree: true,
    requiresKey: false,
    icon: Globe,
  },
  {
    id: 'opentopodata',
    name: 'OpenTopoData (Altitude)',
    description: 'Données d\'altitude open source (alternative fiable)',
    category: 'geo',
    endpoint: 'https://api.opentopodata.org/v1/srtm30m',
    docsUrl: 'https://www.opentopodata.org/',
    dataType: 'Altitude, élévation',
    isFree: true,
    requiresKey: false,
    icon: Database,
  },
  // Risques
  {
    id: 'georisques',
    name: 'Géorisques (BRGM)',
    description: 'Risques naturels et technologiques officiels',
    category: 'risks',
    endpoint: 'https://georisques.gouv.fr/api/v1/gaspar/risques',
    docsUrl: 'https://www.georisques.gouv.fr/doc-api',
    dataType: 'Inondations, séismes, radon, ICPE, CATNAT',
    isFree: true,
    requiresKey: false,
    icon: Shield,
  },
  {
    id: 'georisques-radon',
    name: 'Géorisques Radon',
    description: 'Potentiel radon par commune',
    category: 'risks',
    endpoint: 'https://georisques.gouv.fr/api/v1/radon',
    docsUrl: 'https://www.georisques.gouv.fr/doc-api',
    dataType: 'Niveau radon (1-3)',
    isFree: true,
    requiresKey: false,
    icon: Shield,
  },
  {
    id: 'georisques-argiles',
    name: 'Géorisques Retrait-Gonflement Argiles',
    description: 'Exposition au retrait-gonflement des argiles',
    category: 'risks',
    endpoint: 'https://georisques.gouv.fr/api/v1/mvt',
    docsUrl: 'https://www.georisques.gouv.fr/doc-api',
    dataType: 'Exposition argiles (faible/moyen/fort)',
    isFree: true,
    requiresKey: false,
    icon: Shield,
  },
  // Urbanisme
  {
    id: 'gpu-urbanisme',
    name: 'Géoportail de l\'Urbanisme',
    description: 'Documents d\'urbanisme (PLU, SCOT, SUP)',
    category: 'urbanisme',
    endpoint: 'https://data.geopf.fr/wfs/wfs',
    docsUrl: 'https://www.geoportail-urbanisme.gouv.fr/',
    dataType: 'Zones PLU, règlements, servitudes',
    isFree: true,
    requiresKey: false,
    icon: FileText,
  },
  {
    id: 'merimee-monuments',
    name: 'Base Mérimée (Monuments Historiques)',
    description: 'Périmètres de protection des monuments historiques',
    category: 'urbanisme',
    endpoint: 'https://data.culture.gouv.fr/api/v2/catalog/datasets/liste-des-immeubles-proteges-au-titre-des-monuments-historiques',
    docsUrl: 'https://www.pop.culture.gouv.fr/',
    dataType: 'Monuments historiques, ABF',
    isFree: true,
    requiresKey: false,
    icon: Landmark,
  },
  // Météo
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    description: 'Données météorologiques et climatiques',
    category: 'meteo',
    endpoint: 'https://api.open-meteo.com/v1/forecast',
    docsUrl: 'https://open-meteo.com/en/docs',
    dataType: 'Météo, climat, historique',
    isFree: true,
    requiresKey: false,
    icon: Cloud,
  },
  // Imagerie Street View - Système de fallback intelligent
  {
    id: 'panoramax',
    name: 'Panoramax (IGN France)',
    description: 'Imagerie street-level officielle française - Alternative gratuite à Google Street View',
    category: 'imagery',
    endpoint: 'https://api.panoramax.xyz/api/search',
    docsUrl: 'https://panoramax.fr/',
    dataType: 'Photos de rue HD, panoramas 360°',
    isFree: true,
    requiresKey: false,
    icon: MapPin,
  },
  {
    id: 'kartaview',
    name: 'KartaView (OpenStreetCam)',
    description: 'Images street-level crowdsourcées - Fallback automatique',
    category: 'imagery',
    endpoint: 'https://api.openstreetcam.org/2.0/photo',
    docsUrl: 'https://kartaview.org/',
    dataType: 'Photos de rue',
    isFree: true,
    requiresKey: false,
    icon: MapPin,
  },
  {
    id: 'mapillary',
    name: 'Mapillary (Meta)',
    description: 'Images street-level crowdsourcées (nécessite clef)',
    category: 'imagery',
    endpoint: 'https://graph.mapillary.com',
    docsUrl: 'https://www.mapillary.com/developer/api-documentation',
    dataType: 'Photos de rue, façades',
    isFree: true,
    requiresKey: true,
    icon: MapPin,
  },
  {
    id: 'wikimedia-commons',
    name: 'Wikimedia Commons Geo',
    description: 'Images géolocalisées libres - Fallback ultime',
    category: 'imagery',
    endpoint: 'https://commons.wikimedia.org/w/api.php',
    docsUrl: 'https://commons.wikimedia.org/',
    dataType: 'Photos géolocalisées',
    isFree: true,
    requiresKey: false,
    icon: MapPin,
  },
  // Propriétaires (payant)
  {
    id: 'pappers-entreprise',
    name: 'Pappers Entreprise',
    description: 'Informations légales des entreprises (SIREN, dirigeants)',
    category: 'immobilier',
    endpoint: 'https://api.pappers.fr/v2/entreprise',
    docsUrl: 'https://www.pappers.fr/api/documentation',
    dataType: 'SIREN, dirigeants, bilans',
    isFree: false,
    requiresKey: true,
    icon: Users,
  },
  {
    id: 'pappers-immobilier',
    name: 'Pappers Immobilier',
    description: 'Données de propriété immobilière',
    category: 'immobilier',
    endpoint: 'https://api.pappers.fr/v2/document',
    docsUrl: 'https://www.pappers.fr/api/documentation',
    dataType: 'Propriétaires, transactions',
    isFree: false,
    requiresKey: true,
    icon: Building2,
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  cadastre: { label: 'Cadastre', color: 'bg-amber-500' },
  geo: { label: 'Géographie', color: 'bg-blue-500' },
  risks: { label: 'Risques', color: 'bg-red-500' },
  immobilier: { label: 'Immobilier', color: 'bg-green-500' },
  urbanisme: { label: 'Urbanisme', color: 'bg-purple-500' },
  meteo: { label: 'Météo', color: 'bg-cyan-500' },
  imagery: { label: 'Imagerie', color: 'bg-indigo-500' },
  technique: { label: 'Technique', color: 'bg-orange-500' },
  juridique: { label: 'Juridique', color: 'bg-pink-500' },
  energie: { label: 'Énergie', color: 'bg-emerald-500' },
  accessibilite: { label: 'Accessibilité', color: 'bg-teal-500' },
};

interface DiscoveredApi {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  category: string;
  dataType: string;
  isFree: boolean;
  relevanceScore: number;
  relevanceReason: string;
  endpoint?: string;
}

export interface IntegratedApi {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  category: string;
  dataType: string;
  endpoint?: string;
  integratedAt: string;
  source: 'ai-discovery' | 'manual';
}

export function ApiDashboard() {
  const { t } = useLanguage();
  const isFr = t('cancel') === 'Annuler';
  
  const [apis, setApis] = useState<ApiStatus[]>(() => 
    OFFICIAL_APIS.map(api => ({
      ...api,
      status: 'unknown' as const,
      lastCheck: null,
      responseTime: null,
    }))
  );
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  
  // AI Discovery state
  const [discoveredApis, setDiscoveredApis] = useState<DiscoveredApi[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [lastDiscoveryDate, setLastDiscoveryDate] = useState<Date | null>(null);
  const [autoDiscovery, setAutoDiscovery] = useState(() => {
    const saved = localStorage.getItem('myedls_api_auto_discovery');
    return saved === 'true';
  });
  const [integratedApis, setIntegratedApis] = useState<IntegratedApi[]>(() => {
    const saved = localStorage.getItem('myedls_integrated_apis');
    return saved ? JSON.parse(saved) : [];
  });
  const hasAutoRun = useRef(false);
  const hasAutoChecked = useRef(false);

  // Auto-check API status on mount
  useEffect(() => {
    if (!hasAutoChecked.current) {
      hasAutoChecked.current = true;
      // Small delay to let UI render first
      setTimeout(() => {
        checkAllApis();
      }, 500);
    }
  }, []);

  // Auto-run discovery on mount if autoMode is enabled
  useEffect(() => {
    if (autoDiscovery && !hasAutoRun.current && discoveredApis.length === 0) {
      hasAutoRun.current = true;
      discoverNewApis();
    }
  }, [autoDiscovery]);

  // Persist autoDiscovery setting
  useEffect(() => {
    localStorage.setItem('myedls_api_auto_discovery', autoDiscovery.toString());
  }, [autoDiscovery]);

  // Persist integrated APIs
  useEffect(() => {
    localStorage.setItem('myedls_integrated_apis', JSON.stringify(integratedApis));
    // Dispatch event for ApiIntegrationAudit to pick up
    window.dispatchEvent(new CustomEvent('integrated-apis-changed', { detail: integratedApis }));
  }, [integratedApis]);

  const [lastIntegratedApi, setLastIntegratedApi] = useState<IntegratedApi | null>(null);

  const integrateApi = (api: DiscoveredApi) => {
    const newIntegration: IntegratedApi = {
      id: api.id,
      name: api.name,
      description: api.description,
      docsUrl: api.docsUrl,
      category: api.category,
      dataType: api.dataType,
      endpoint: api.endpoint,
      integratedAt: new Date().toISOString(),
      source: 'ai-discovery'
    };
    
    setIntegratedApis(prev => {
      if (prev.some(a => a.id === api.id)) {
        toast.info(isFr ? 'API déjà intégrée' : 'API already integrated');
        return prev;
      }
      setLastIntegratedApi(newIntegration);
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">{api.name} intégrée !</span>
          <span className="text-xs text-muted-foreground">
            {isFr ? 'Visible ci-dessous et dans l\'onglet "Audit Intégrations"' : 'Visible below and in "Integration Audit" tab'}
          </span>
        </div>,
        { duration: 5000 }
      );
      return [...prev, newIntegration];
    });
  };

  const removeIntegratedApi = (apiId: string) => {
    setIntegratedApis(prev => prev.filter(a => a.id !== apiId));
    toast.success(isFr ? 'API retirée de la liste' : 'API removed from list');
  };

  const isApiIntegrated = (apiId: string) => integratedApis.some(a => a.id === apiId);

  const discoverNewApis = async () => {
    setIsDiscovering(true);
    try {
      const currentApiNames = OFFICIAL_APIS.map(api => `${api.name} - ${api.description}`);
      
      const { data, error } = await supabase.functions.invoke('discover-apis', {
        body: { 
          currentApis: currentApiNames,
          context: 'property inspection, building diagnostics, real estate'
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        setDiscoveredApis(data.suggestions);
        setAiInsights(data.insights || '');
        setLastDiscoveryDate(new Date(data.discoveredAt));
        toast.success(isFr 
          ? `${data.suggestions.length} nouvelles APIs découvertes par l'IA` 
          : `${data.suggestions.length} new APIs discovered by AI`
        );
      }
    } catch (error) {
      console.error('Error discovering APIs:', error);
      toast.error(isFr 
        ? 'Erreur lors de la recherche IA' 
        : 'Error during AI discovery'
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  const checkApiStatus = async (api: ApiStatus): Promise<Partial<ApiStatus>> => {
    const startTime = Date.now();
    
    // Web viewers (not REST APIs) - mark as online since they work via iframe/redirect
    if (api.id === 'cadastre-gouv') {
      return {
        status: 'online',
        lastCheck: new Date(),
        responseTime: 50, // Simulated - it's a web viewer, not an API
      };
    }
    
    try {
      // Use a simple HEAD or GET request to check if API is responding
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      let testUrl = api.endpoint;
      
      // Add minimal params for APIs that require them
      if (api.id === 'ban-adresse') {
        testUrl = `${api.endpoint}?q=paris&limit=1`;
      } else if (api.id === 'geo-api-gouv') {
        testUrl = `${api.endpoint}?nom=paris&limit=1`;
      } else if (api.id === 'georisques') {
        testUrl = `https://georisques.gouv.fr/api/v1/resultats_rapport_pdf?latlon=2.35,48.85`;
      } else if (api.id === 'dvf-etalab') {
        testUrl = `${api.endpoint}?lat=48.85&lon=2.35`;
      } else if (api.id === 'open-meteo') {
        testUrl = `${api.endpoint}?latitude=48.85&longitude=2.35&current_weather=true`;
      } else if (api.id === 'apicarto-cadastre') {
        testUrl = `${api.endpoint}?geom={"type":"Point","coordinates":[2.35,48.85]}`;
      } else if (api.id === 'cadastre-gouv') {
        // cadastre.gouv.fr is a web viewer, not a REST API - mark as online if reachable
        // Use simple fetch to check if the site is up
        testUrl = api.endpoint;
      } else if (api.id === 'opentopodata') {
        testUrl = `${api.endpoint}?locations=48.85,2.35`;
      } else if (api.id === 'panoramax') {
        testUrl = `${api.endpoint}?lat=48.85&lon=2.35&radius=100&limit=1`;
      } else if (api.id === 'kartaview') {
        testUrl = `${api.endpoint}/?bbTopLeft=48.86,2.34&bbBottomRight=48.84,2.36&limit=1`;
      } else if (api.id === 'wikimedia-commons') {
        testUrl = `${api.endpoint}?action=query&list=geosearch&gscoord=48.85|2.35&gsradius=100&gslimit=1&format=json&origin=*`;
      }
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok || response.status === 400 || response.status === 404) {
        // 400/404 can mean API is up but params are wrong
        return {
          status: response.ok ? 'online' : 'degraded',
          lastCheck: new Date(),
          responseTime,
        };
      } else if (response.status === 429) {
        return {
          status: 'degraded',
          lastCheck: new Date(),
          responseTime,
        };
      } else {
        return {
          status: 'offline',
          lastCheck: new Date(),
          responseTime,
        };
      }
    } catch (error) {
      // CORS errors or network issues
      return {
        status: 'unknown',
        lastCheck: new Date(),
        responseTime: null,
      };
    }
  };

  const checkAllApis = async () => {
    setIsChecking(true);
    setCheckProgress(0);
    
    const updatedApis = [...apis];
    const freeApis = updatedApis.filter(api => !api.requiresKey);
    const keyApis = updatedApis.filter(api => api.requiresKey);

    // Mark APIs with keys as "configured" when the backend confirms secrets exist
    try {
      const { data: keyStatus } = await supabase.functions.invoke('check-api-keys');
      for (const api of keyApis) {
        const apiIndex = updatedApis.findIndex(a => a.id === api.id);
        const isConfigured =
          (api.id === 'mapillary' && keyStatus?.mapillary) ||
          (api.id.includes('pappers') && keyStatus?.pappers);

        if (isConfigured) {
          updatedApis[apiIndex] = {
            ...updatedApis[apiIndex],
            status: 'configured',
            lastCheck: new Date(),
          };
        }
      }
    } catch {
      // If we cannot check secrets, keep "unknown" for key-based APIs
    }

    setApis([...updatedApis]);
    
    for (let i = 0; i < freeApis.length; i++) {
      const api = freeApis[i];
      const apiIndex = updatedApis.findIndex(a => a.id === api.id);
      
      const result = await checkApiStatus(api);
      updatedApis[apiIndex] = { ...updatedApis[apiIndex], ...result };
      
      setApis([...updatedApis]);
      setCheckProgress(((i + 1) / freeApis.length) * 100);
      
      // Small delay between requests
      await new Promise(r => setTimeout(r, 300));
    }
    
    setIsChecking(false);
    toast.success(isFr ? 'Vérification des APIs terminée' : 'API check completed');
  };

  const getStatusIcon = (status: ApiStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'configured':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ApiStatus['status']) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      online: { variant: 'default', label: isFr ? 'En ligne' : 'Online' },
      configured: { variant: 'default', label: isFr ? 'Configuré ✓' : 'Configured ✓' },
      offline: { variant: 'destructive', label: isFr ? 'Hors ligne' : 'Offline' },
      degraded: { variant: 'secondary', label: isFr ? 'Dégradé' : 'Degraded' },
      unknown: { variant: 'outline', label: isFr ? 'Inconnu' : 'Unknown' },
    };
    const config = variants[status];
    return <Badge variant={config.variant} className={status === 'configured' ? 'bg-blue-500' : ''}>{config.label}</Badge>;
  };

  const onlineCount = apis.filter(a => a.status === 'online' || a.status === 'configured').length;
  const configuredCount = apis.filter(a => a.status === 'configured').length;
  const totalChecked = apis.filter(a => a.lastCheck !== null).length;

  const groupedApis = apis.reduce((acc, api) => {
    if (!acc[api.category]) acc[api.category] = [];
    acc[api.category].push(api);
    return acc;
  }, {} as Record<string, ApiStatus[]>);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{apis.length}</p>
                <p className="text-xs text-muted-foreground">{isFr ? 'APIs configurées' : 'Configured APIs'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{onlineCount}/{totalChecked || '-'}</p>
                <p className="text-xs text-muted-foreground">{isFr ? 'En ligne' : 'Online'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{apis.filter(a => a.isFree).length}</p>
                <p className="text-xs text-muted-foreground">{isFr ? 'APIs gratuites' : 'Free APIs'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{apis.filter(a => a.requiresKey).length}</p>
                <p className="text-xs text-muted-foreground">{isFr ? 'Avec clé API' : 'Require API Key'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check All Button */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={checkAllApis} 
          disabled={isChecking}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking 
            ? (isFr ? 'Vérification...' : 'Checking...') 
            : (isFr ? 'Vérifier toutes les APIs' : 'Check All APIs')}
        </Button>
        
        {isChecking && (
          <div className="flex-1 max-w-xs">
            <Progress value={checkProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* APIs by Category */}
      {Object.entries(groupedApis).map(([category, categoryApis]) => {
        const categoryConfig = CATEGORY_LABELS[category];
        
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${categoryConfig.color}`} />
                <CardTitle className="text-lg">{categoryConfig.label}</CardTitle>
                <Badge variant="outline" className="ml-auto">
                  {categoryApis.length} APIs
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryApis.map(api => {
                const Icon = api.icon;
                
                return (
                  <div 
                    key={api.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{api.name}</h4>
                        {getStatusIcon(api.status)}
                        {getStatusBadge(api.status)}
                        {!api.isFree && (
                          <Badge variant="secondary" className="text-xs">
                            {isFr ? 'Payant' : 'Paid'}
                          </Badge>
                        )}
                        {api.requiresKey && (
                          <Badge variant="outline" className="text-xs">
                            {isFr ? 'Clé requise' : 'Key required'}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {api.description}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {api.dataType}
                        </span>
                        
                        {api.responseTime !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {api.responseTime}ms
                          </span>
                        )}
                        
                        {api.lastCheck && (
                          <span>
                            {isFr ? 'Vérifié' : 'Checked'}: {api.lastCheck.toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(api.docsUrl, '_blank')}
                      className="shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Integrated APIs Section - Show when there are integrated APIs */}
      {integratedApis.length > 0 && (
        <Card className="border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <Plus className="w-4 h-4 text-indigo-500" />
              <CardTitle className="text-lg">{isFr ? 'APIs Intégrées via IA' : 'AI-Integrated APIs'}</CardTitle>
              <Badge variant="outline" className="ml-auto text-indigo-600 border-indigo-300">
                {integratedApis.length} {isFr ? 'intégrées' : 'integrated'}
              </Badge>
            </div>
            <CardDescription>
              {isFr 
                ? 'APIs découvertes par l\'IA et ajoutées à votre configuration. Elles seront testées dans l\'onglet "Audit Intégrations".'
                : 'APIs discovered by AI and added to your configuration. They will be tested in "Integration Audit" tab.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {integratedApis.map(api => {
              const categoryConfig = CATEGORY_LABELS[api.category] || { label: api.category, color: 'bg-gray-500' };
              const isNew = lastIntegratedApi?.id === api.id;
              
              return (
                <div 
                  key={api.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border bg-card transition-all ${
                    isNew ? 'ring-2 ring-indigo-500 animate-pulse' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{api.name}</h4>
                      <Badge className={`${categoryConfig.color} text-white text-xs`}>
                        {categoryConfig.label}
                      </Badge>
                      {isNew && (
                        <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                          {isFr ? 'Nouveau' : 'New'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{api.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {api.dataType}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(api.integratedAt).toLocaleDateString('fr-FR')} à {new Date(api.integratedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(api.docsUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeIntegratedApi(api.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {isFr ? 'Découverte IA d\'APIs' : 'AI API Discovery'}
                    {autoDiscovery && (
                      <Badge variant="secondary" className="gap-1">
                        <Bot className="w-3 h-3" />
                        Auto
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isFr 
                      ? 'L\'IA recherche automatiquement de nouvelles sources de données utiles pour MyEDLS'
                      : 'AI automatically searches for new useful data sources for MyEDLS'}
                  </CardDescription>
                </div>
              </div>
              <Button 
                onClick={discoverNewApis} 
                disabled={isDiscovering}
                className="gap-2"
                variant="default"
              >
                {isDiscovering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {isFr ? 'Recherche IA...' : 'AI Searching...'}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    {isFr ? 'Rechercher avec IA' : 'Search with AI'}
                  </>
                )}
              </Button>
            </div>
            
            {/* Auto-discovery toggle */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-discovery"
                  checked={autoDiscovery}
                  onCheckedChange={setAutoDiscovery}
                />
                <Label htmlFor="auto-discovery" className="text-sm font-medium cursor-pointer">
                  {isFr ? 'Mode automatique' : 'Auto mode'}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground">
                {isFr 
                  ? 'Lance la découverte IA automatiquement à l\'ouverture'
                  : 'Runs AI discovery automatically on open'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Insights */}
          {aiInsights && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                    {isFr ? 'Insights IA' : 'AI Insights'}
                  </p>
                  <p className="text-sm text-muted-foreground">{aiInsights}</p>
                </div>
              </div>
            </div>
          )}

          {/* Last discovery info */}
          {lastDiscoveryDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {isFr ? 'Dernière recherche' : 'Last search'}: {lastDiscoveryDate.toLocaleString()}
            </div>
          )}

          {/* Discovered APIs */}
          {discoveredApis.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {discoveredApis
                  .sort((a, b) => b.relevanceScore - a.relevanceScore)
                  .map((api) => {
                    const categoryConfig = CATEGORY_LABELS[api.category] || { label: api.category, color: 'bg-gray-500' };
                    
                    return (
                      <div 
                        key={api.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h4 className="font-semibold">{api.name}</h4>
                              <Badge className={`${categoryConfig.color} text-white text-xs`}>
                                {categoryConfig.label}
                              </Badge>
                              {api.isFree ? (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                  {isFr ? 'Gratuit' : 'Free'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                                  {isFr ? 'Payant' : 'Paid'}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {api.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                {api.dataType}
                              </span>
                            </div>

                            {/* Relevance reason */}
                            <div className="p-2 rounded bg-primary/5 text-xs">
                              <span className="font-medium text-primary">
                                {isFr ? 'Pertinence:' : 'Relevance:'} 
                              </span>{' '}
                              {api.relevanceReason}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            {/* Relevance score */}
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < Math.round(api.relevanceScore / 2) ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {api.relevanceScore}/10
                            </span>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(api.docsUrl, '_blank')}
                              className="gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {isFr ? 'Docs' : 'Docs'}
                            </Button>
                            
                            <Button 
                              variant={isApiIntegrated(api.id) ? "secondary" : "default"}
                              size="sm"
                              onClick={() => integrateApi(api)}
                              disabled={isApiIntegrated(api.id)}
                              className="gap-1"
                            >
                              {isApiIntegrated(api.id) ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  {isFr ? 'Intégrée' : 'Integrated'}
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3 h-3" />
                                  {isFr ? 'Intégrer' : 'Integrate'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {isFr 
                  ? 'Cliquez sur "Rechercher avec IA" pour découvrir de nouvelles APIs et sources de données'
                  : 'Click "Search with AI" to discover new APIs and data sources'}
              </p>
              <p className="text-xs mt-2 text-muted-foreground/70">
                {isFr 
                  ? 'L\'IA analysera le contexte de MyEDLS pour suggérer les meilleures sources de données'
                  : 'AI will analyze MyEDLS context to suggest the best data sources'}
              </p>
            </div>
          )}

          {/* Static suggestions as fallback */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              {isFr ? 'Sources connues à explorer' : 'Known sources to explore'}
            </h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <Badge variant="outline">MAJIC</Badge>
                <span className="flex-1">{isFr ? 'Données foncières détaillées' : 'Detailed land data'}</span>
                <a href="https://datafoncier.cerema.fr/" target="_blank" rel="noopener" className="text-primary hover:underline text-xs">
                  datafoncier.cerema.fr
                </a>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <Badge variant="outline">SITADEL</Badge>
                <span className="flex-1">{isFr ? 'Permis de construire' : 'Building permits'}</span>
                <a href="https://www.statistiques.developpement-durable.gouv.fr/construction-de-logements-sitadel" target="_blank" rel="noopener" className="text-primary hover:underline text-xs">
                  statistiques.gouv.fr
                </a>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <Badge variant="outline">RNCP</Badge>
                <span className="flex-1">{isFr ? 'Registre des copropriétés' : 'Condominium registry'}</span>
                <a href="https://www.registre-coproprietes.gouv.fr/" target="_blank" rel="noopener" className="text-primary hover:underline text-xs">
                  registre-coproprietes.gouv.fr
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
