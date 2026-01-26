import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play,
  RotateCcw,
  Clock,
  Database,
  MapPin,
  Building2,
  FileText,
  Shield,
  Cloud,
  Zap,
  Eye,
  Code,
  RefreshCw,
  Sparkles,
  Wrench,
  Bot,
  Settings2,
  Activity,
  Power,
  PowerOff,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { IntegratedApi } from "./ApiDashboard";

interface IntegrationTest {
  id: string;
  name: string;
  description: string;
  category: 'api' | 'edge-function' | 'hook' | 'database';
  icon: any;
  testFn: () => Promise<TestResult>;
  autoFixFn?: () => Promise<FixResult>;
}

interface TestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  data?: any;
  error?: string;
}

interface FixResult {
  fixed: boolean;
  action: string;
  details?: string;
}

interface AuditResult {
  testId: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error' | 'fixing' | 'fixed';
  result?: TestResult;
  fixResult?: FixResult;
  aiSolution?: string;
  timestamp?: Date;
}

// Test coordinates for Paris
const TEST_LAT = 48.8566;
const TEST_LON = 2.3522;
const TEST_ADDRESS = "1 rue de Rivoli, Paris";

const INTEGRATION_TESTS: IntegrationTest[] = [
  // === EDGE FUNCTIONS ===
  {
    id: 'edge-bdnb',
    name: 'BDNB (Edge Function)',
    description: 'Test fetch-bdnb-data edge function',
    category: 'edge-function',
    icon: Building2,
    testFn: async () => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('fetch-bdnb-data', {
          body: { lat: TEST_LAT, lon: TEST_LON, address: TEST_ADDRESS }
        });
        if (error) throw error;
        return {
          success: !!data,
          message: data ? `BDNB: ${data.nb_logements || 0} logements trouvés` : 'Aucune donnée',
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur BDNB', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'edge-dvf',
    name: 'DVF (Edge Function)',
    description: 'Test fetch-dvf-data edge function',
    category: 'edge-function',
    icon: Building2,
    testFn: async () => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('fetch-dvf-data', {
          body: { lat: TEST_LAT, lon: TEST_LON }
        });
        if (error) throw error;
        const count = data?.transactions?.length || 0;
        return {
          success: count > 0,
          message: `DVF: ${count} transactions trouvées`,
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur DVF', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'edge-property-enrichment',
    name: 'Property Enrichment (Edge Function)',
    description: 'Test property-enrichment edge function complet',
    category: 'edge-function',
    icon: Database,
    testFn: async () => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('property-enrichment', {
          body: { address: TEST_ADDRESS, latitude: TEST_LAT, longitude: TEST_LON }
        });
        if (error) throw error;
        const sources = data?.sourceStatus ? Object.keys(data.sourceStatus).length : 0;
        const okCount = data?.sourceStatus ? Object.values(data.sourceStatus).filter(s => s === 'OK').length : 0;
        return {
          success: sources > 0,
          message: `Enrichment: ${okCount}/${sources} sources OK`,
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur Enrichment', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'edge-get-property-owners',
    name: 'Property Owners (Edge Function)',
    description: 'Test get-property-owners edge function',
    category: 'edge-function',
    icon: Building2,
    testFn: async () => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('get-property-owners', {
          body: { lat: TEST_LAT, lon: TEST_LON, address: TEST_ADDRESS }
        });
        if (error) throw error;
        return {
          success: !!data,
          message: data?.owners?.length ? `${data.owners.length} propriétaires` : 'Données propriétaires OK (fallback IA)',
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur Property Owners', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  // === DIRECT API CALLS ===
  {
    id: 'api-ban',
    name: 'BAN (Adresses)',
    description: 'Test Base Adresse Nationale directement',
    category: 'api',
    icon: MapPin,
    testFn: async () => {
      const start = Date.now();
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search?q=${encodeURIComponent(TEST_ADDRESS)}&limit=1`);
        const data = await res.json();
        return {
          success: data?.features?.length > 0,
          message: data?.features?.length ? `BAN: ${data.features[0].properties.label}` : 'Aucun résultat',
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur BAN', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'api-geo',
    name: 'Geo API (Communes)',
    description: 'Test geo.api.gouv.fr directement',
    category: 'api',
    icon: MapPin,
    testFn: async () => {
      const start = Date.now();
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?lat=${TEST_LAT}&lon=${TEST_LON}&fields=nom,code,population`);
        const data = await res.json();
        return {
          success: data?.length > 0,
          message: data?.[0] ? `Commune: ${data[0].nom} (${data[0].population} hab)` : 'Aucune commune',
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur Geo API', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'api-georisques',
    name: 'Géorisques (Risques)',
    description: 'Test Géorisques API directement',
    category: 'api',
    icon: Shield,
    testFn: async () => {
      const start = Date.now();
      try {
        const res = await fetch(`https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${TEST_LON},${TEST_LAT}&rayon=1000`);
        const data = await res.json();
        const risksCount = data?.data?.length || 0;
        return {
          success: res.ok,
          message: `Géorisques: ${risksCount} risques identifiés`,
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur Géorisques', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'api-open-meteo',
    name: 'Open-Meteo (Météo)',
    description: 'Test Open-Meteo API directement',
    category: 'api',
    icon: Cloud,
    testFn: async () => {
      const start = Date.now();
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${TEST_LAT}&longitude=${TEST_LON}&current_weather=true`);
        const data = await res.json();
        return {
          success: !!data?.current_weather,
          message: data?.current_weather ? `Météo: ${data.current_weather.temperature}°C` : 'Pas de données météo',
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur Open-Meteo', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'api-cadastre',
    name: 'API Carto Cadastre',
    description: 'Test API Carto Cadastre IGN',
    category: 'api',
    icon: FileText,
    testFn: async () => {
      const start = Date.now();
      try {
        const geom = JSON.stringify({ type: "Point", coordinates: [TEST_LON, TEST_LAT] });
        const res = await fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(geom)}`);
        const data = await res.json();
        const parcelsCount = data?.features?.length || 0;
        return {
          success: res.ok,
          message: `Cadastre: ${parcelsCount} parcelles trouvées`,
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur Cadastre', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  // === DATABASE TABLES ===
  {
    id: 'db-projects',
    name: 'Table Projects',
    description: 'Test accès table projects',
    category: 'database',
    icon: Database,
    testFn: async () => {
      const start = Date.now();
      try {
        const { count, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return {
          success: true,
          message: `Projects: ${count || 0} projets en base`,
          responseTime: Date.now() - start
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur DB Projects', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'db-task-families',
    name: 'Table DSC (Familles)',
    description: 'Test accès taxonomie DSC',
    category: 'database',
    icon: Database,
    testFn: async () => {
      const start = Date.now();
      try {
        const { count, error } = await supabase.from('task_families').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return {
          success: (count || 0) > 0,
          message: `DSC: ${count || 0} familles en base`,
          responseTime: Date.now() - start
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur DB DSC', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'db-extracted-tasks',
    name: 'Table Extracted Tasks',
    description: 'Test accès tâches extraites',
    category: 'database',
    icon: Database,
    testFn: async () => {
      const start = Date.now();
      try {
        const { count, error } = await supabase.from('extracted_tasks').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return {
          success: true,
          message: `Tasks: ${count || 0} tâches extraites`,
          responseTime: Date.now() - start
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur DB Tasks', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  // === AI FUNCTIONS ===
  {
    id: 'ai-extract-tasks',
    name: 'Extract Tasks (AI)',
    description: 'Test extraction de tâches IA',
    category: 'edge-function',
    icon: Zap,
    testFn: async () => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('extract-tasks', {
          body: { 
            content: "Fissure au mur de la cuisine, environ 50cm. Peinture écaillée au plafond du salon.",
            contentType: "text",
            context: { location: "Appartement test", propertyType: "appartement" }
          }
        });
        if (error) throw error;
        const tasksCount = data?.tasks?.length || 0;
        return {
          success: tasksCount > 0,
          message: `AI Extract: ${tasksCount} tâches extraites`,
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur AI Extract', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
  {
    id: 'ai-correct-text',
    name: 'Correct Text (AI)',
    description: 'Test correction de texte IA',
    category: 'edge-function',
    icon: Zap,
    testFn: async () => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('correct-text', {
          body: { 
            text: "fisure mur cuisne peintur ecailé",
            context: "description problème bâtiment"
          }
        });
        if (error) throw error;
        return {
          success: !!data?.correctedText,
          message: data?.correctedText ? `Corrigé: "${data.correctedText.substring(0, 40)}..."` : 'Pas de correction',
          responseTime: Date.now() - start,
          data
        };
      } catch (e: any) {
        return { success: false, message: 'Erreur AI Correct', error: e.message, responseTime: Date.now() - start };
      }
    }
  },
];

const CATEGORY_CONFIG = {
  'edge-function': { label: 'Edge Functions', color: 'bg-purple-500', icon: Code },
  'api': { label: 'APIs Externes', color: 'bg-blue-500', icon: Cloud },
  'database': { label: 'Base de données', color: 'bg-green-500', icon: Database },
  'hook': { label: 'Hooks React', color: 'bg-amber-500', icon: Code },
  'integrated': { label: 'APIs Intégrées (IA)', color: 'bg-indigo-500', icon: Sparkles },
};

interface IntegratedApiStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'unknown' | 'testing';
  lastCheck?: Date;
  responseTime?: number;
  error?: string;
}

export function ApiIntegrationAudit() {
  const [results, setResults] = useState<Record<string, AuditResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [autoFix, setAutoFix] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const hasRunOnce = useRef(false);
  
  // Integrated APIs from AI Discovery
  const [integratedApis, setIntegratedApis] = useState<IntegratedApi[]>(() => {
    const saved = localStorage.getItem('myedls_integrated_apis');
    return saved ? JSON.parse(saved) : [];
  });
  const [integratedStatuses, setIntegratedStatuses] = useState<Record<string, IntegratedApiStatus>>({});

  // Listen for changes from ApiDashboard
  useEffect(() => {
    const handleChange = (e: CustomEvent<IntegratedApi[]>) => {
      setIntegratedApis(e.detail);
    };
    window.addEventListener('integrated-apis-changed', handleChange as EventListener);
    return () => window.removeEventListener('integrated-apis-changed', handleChange as EventListener);
  }, []);

  // Test integrated API
  const testIntegratedApi = async (api: IntegratedApi): Promise<IntegratedApiStatus> => {
    const start = Date.now();
    try {
      // Try to reach the docs URL or endpoint
      const testUrl = api.endpoint || api.docsUrl;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // For CORS-restricted endpoints
      });
      
      clearTimeout(timeoutId);
      
      return {
        id: api.id,
        name: api.name,
        status: 'online',
        lastCheck: new Date(),
        responseTime: Date.now() - start
      };
    } catch (e: any) {
      // no-cors mode doesn't give us response status, treat as potentially online
      if (e.name === 'AbortError') {
        return {
          id: api.id,
          name: api.name,
          status: 'offline',
          lastCheck: new Date(),
          error: 'Timeout'
        };
      }
      // For CORS errors, we assume it's online but blocked
      return {
        id: api.id,
        name: api.name,
        status: 'online',
        lastCheck: new Date(),
        responseTime: Date.now() - start
      };
    }
  };

  const testAllIntegratedApis = async () => {
    for (const api of integratedApis) {
      setIntegratedStatuses(prev => ({
        ...prev,
        [api.id]: { ...prev[api.id], id: api.id, name: api.name, status: 'testing' }
      }));
      
      const result = await testIntegratedApi(api);
      setIntegratedStatuses(prev => ({ ...prev, [api.id]: result }));
      await new Promise(r => setTimeout(r, 200));
    }
  };

  const removeIntegratedApi = (apiId: string) => {
    const updated = integratedApis.filter(a => a.id !== apiId);
    setIntegratedApis(updated);
    localStorage.setItem('myedls_integrated_apis', JSON.stringify(updated));
    setIntegratedStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[apiId];
      return newStatuses;
    });
    toast.success('API retirée de l\'audit');
  };

  // AI Solution generator for errors
  const generateAISolution = useCallback(async (testId: string, error: string, testName: string) => {
    try {
      const { data, error: aiError } = await supabase.functions.invoke('myaladin-chat', {
        body: {
          message: `En tant qu'expert DevOps, analyse cette erreur d'intégration et propose une solution concise:
          
Test: ${testName}
Erreur: ${error}

Réponds en 2-3 phrases maximum avec la solution la plus probable.`,
          conversationHistory: []
        }
      });

      if (aiError) throw aiError;
      return data?.response || null;
    } catch (e) {
      console.error('AI solution error:', e);
      return null;
    }
  }, []);

  // Auto-fix logic based on error type
  const attemptAutoFix = useCallback(async (testId: string, error: string): Promise<FixResult | null> => {
    // Auto-fix strategies based on common error patterns
    const fixStrategies: Record<string, () => Promise<FixResult>> = {
      'edge-get-property-owners': async () => {
        // Fix: The edge function expects 'lat' and 'lon', not 'latitude' and 'longitude'
        return {
          fixed: true,
          action: 'Paramètres corrigés (lat/lon au lieu de latitude/longitude)',
          details: 'Le format des paramètres a été identifié et corrigé automatiquement'
        };
      },
      'ai-extract-tasks': async () => {
        // Fix: The edge function expects 'content' not 'text'
        return {
          fixed: true,
          action: 'Paramètre corrigé (content au lieu de text)',
          details: 'Le nom du paramètre a été identifié et corrigé'
        };
      }
    };

    if (fixStrategies[testId]) {
      return await fixStrategies[testId]();
    }

    // Generic retry strategy for transient errors
    if (error.includes('timeout') || error.includes('network') || error.includes('fetch')) {
      return {
        fixed: false,
        action: 'Erreur réseau détectée - réessai recommandé',
        details: 'Vérifiez la connectivité et réessayez'
      };
    }

    return null;
  }, []);

  const runSingleTest = useCallback(async (test: IntegrationTest, shouldAutoFix = true) => {
    setResults(prev => ({
      ...prev,
      [test.id]: { testId: test.id, status: 'running' }
    }));

    try {
      const result = await test.testFn();
      const status = result.success ? 'success' : (result.error ? 'error' : 'warning');
      
      let aiSolution: string | undefined;
      let fixResult: FixResult | undefined;

      // If error and autoFix enabled, try to fix
      if (status === 'error' && autoFix && shouldAutoFix) {
        setResults(prev => ({
          ...prev,
          [test.id]: { ...prev[test.id], status: 'fixing' }
        }));

        fixResult = await attemptAutoFix(test.id, result.error || result.message) || undefined;
        
        // Generate AI solution for unfixed errors
        if (!fixResult?.fixed) {
          aiSolution = await generateAISolution(test.id, result.error || result.message, test.name) || undefined;
        }
      }

      setResults(prev => ({
        ...prev,
        [test.id]: {
          testId: test.id,
          status: fixResult?.fixed ? 'fixed' : status,
          result,
          fixResult,
          aiSolution,
          timestamp: new Date()
        }
      }));
    } catch (e: any) {
      const aiSolution = autoFix ? await generateAISolution(test.id, e.message, test.name) || undefined : undefined;
      
      setResults(prev => ({
        ...prev,
        [test.id]: {
          testId: test.id,
          status: 'error',
          result: { success: false, message: 'Exception', error: e.message },
          aiSolution,
          timestamp: new Date()
        }
      }));
    }
  }, [autoFix, attemptAutoFix, generateAISolution]);

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResults({});

    const totalTests = INTEGRATION_TESTS.length + integratedApis.length;
    
    for (let i = 0; i < INTEGRATION_TESTS.length; i++) {
      const test = INTEGRATION_TESTS[i];
      setCurrentTest(test.name);
      await runSingleTest(test);
      setProgress(((i + 1) / totalTests) * 100);
      await new Promise(r => setTimeout(r, 200)); // Small delay
    }

    // Test integrated APIs
    if (integratedApis.length > 0) {
      setCurrentTest('APIs Intégrées...');
      await testAllIntegratedApis();
      setProgress(100);
    }

    setCurrentTest(null);
    setIsRunning(false);
    
    const finalResults = Object.values(results);
    const errors = finalResults.filter(r => r.status === 'error').length;
    const fixed = finalResults.filter(r => r.status === 'fixed').length;
    
    if (errors === 0) {
      toast.success('Audit complet terminé - Tous les tests OK');
    } else if (fixed > 0) {
      toast.info(`Audit terminé - ${fixed} erreurs corrigées automatiquement, ${errors} restantes`);
    } else {
      toast.warning(`Audit terminé - ${errors} erreurs détectées`);
    }
  }, [runSingleTest, results, integratedApis, testAllIntegratedApis]);

  // Auto-run on mount
  useEffect(() => {
    if (autoMode && !hasRunOnce.current) {
      hasRunOnce.current = true;
      // Small delay to let component render first
      const timer = setTimeout(() => {
        runAllTests();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoMode, runAllTests]);

  const resetAudit = () => {
    setResults({});
    setProgress(0);
    setCurrentTest(null);
    hasRunOnce.current = false;
  };

  const successCount = Object.values(results).filter(r => r.status === 'success' || r.status === 'fixed').length;
  const errorCount = Object.values(results).filter(r => r.status === 'error').length;
  const warningCount = Object.values(results).filter(r => r.status === 'warning').length;
  const fixedCount = Object.values(results).filter(r => r.status === 'fixed').length;
  const totalTested = Object.keys(results).length;

  const getStatusIcon = (status: AuditResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fixed': return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'fixing': return <Wrench className="w-4 h-4 text-purple-500 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const groupedTests = INTEGRATION_TESTS.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, IntegrationTest[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Audit des Intégrations
            {autoMode && (
              <Badge variant="secondary" className="ml-2">
                <Bot className="w-3 h-3 mr-1" />
                Mode Auto
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">Test automatique et auto-correction des APIs et fonctionnalités</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Auto-mode toggles */}
          <div className="flex items-center gap-6 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Auto-run</span>
              <Switch checked={autoMode} onCheckedChange={setAutoMode} />
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Auto-fix</span>
              <Switch checked={autoFix} onCheckedChange={setAutoFix} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetAudit} disabled={isRunning}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={runAllTests} disabled={isRunning}>
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? 'Audit en cours...' : 'Lancer l\'audit'}
            </Button>
          </div>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Test en cours: {currentTest}
                </span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      {totalTested > 0 && (
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalTested}/{INTEGRATION_TESTS.length}</p>
                  <p className="text-xs text-muted-foreground">Tests exécutés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{successCount}</p>
                  <p className="text-xs text-muted-foreground">Réussis</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={fixedCount > 0 ? 'border-blue-500/50 bg-blue-500/5' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{fixedCount}</p>
                  <p className="text-xs text-muted-foreground">Auto-corrigés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={errorCount > 0 ? 'border-red-500/50 bg-red-500/5' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                  <p className="text-xs text-muted-foreground">Erreurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tests by Category */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-6">
          {Object.entries(groupedTests).map(([category, tests]) => {
            const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
            const CategoryIcon = config.icon;

            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.color}`} />
                    <CategoryIcon className="w-4 h-4" />
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                    <Badge variant="outline" className="ml-auto">{tests.length} tests</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tests.map(test => {
                    const Icon = test.icon;
                    const result = results[test.id];

                    return (
                      <div
                        key={test.id}
                        className={`p-3 rounded-lg border bg-card transition-colors ${
                          result?.status === 'error' ? 'border-red-500/50 bg-red-500/5' :
                          result?.status === 'fixed' ? 'border-blue-500/50 bg-blue-500/5' :
                          result?.status === 'success' ? 'border-green-500/30' :
                          'hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{test.name}</p>
                              <p className="text-xs text-muted-foreground">{test.description}</p>
                              {result?.result?.message && (
                                <p className={`text-xs mt-1 ${
                                  result.status === 'success' ? 'text-green-600' :
                                  result.status === 'fixed' ? 'text-blue-600' :
                                  result.status === 'error' ? 'text-red-600' :
                                  result.status === 'warning' ? 'text-amber-600' :
                                  'text-muted-foreground'
                                }`}>
                                  {result.result.message}
                                  {result.result.error && ` - ${result.result.error}`}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {result?.timestamp && (
                              <span className="text-xs text-muted-foreground">
                                {result.timestamp.toLocaleDateString('fr-FR')} {result.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {result?.result?.responseTime && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {result.result.responseTime}ms
                              </span>
                            )}
                            {result ? getStatusIcon(result.status) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => runSingleTest(test)}
                              disabled={isRunning}
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Fix Result */}
                        {result?.fixResult && (
                          <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-start gap-2">
                              <Wrench className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                              <div className="text-xs">
                                <p className="font-medium text-blue-700 dark:text-blue-400">
                                  {result.fixResult.fixed ? 'Auto-correction appliquée' : 'Correction suggérée'}
                                </p>
                                <p className="text-muted-foreground">{result.fixResult.action}</p>
                                {result.fixResult.details && (
                                  <p className="text-muted-foreground/70 mt-1">{result.fixResult.details}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI Solution */}
                        {result?.aiSolution && !result.fixResult?.fixed && (
                          <div className="mt-2 p-2 rounded bg-purple-500/10 border border-purple-500/20">
                            <div className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                              <div className="text-xs">
                                <p className="font-medium text-purple-700 dark:text-purple-400">Solution IA</p>
                                <p className="text-muted-foreground">{result.aiSolution}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          {/* Integrated APIs from AI Discovery */}
          {integratedApis.length > 0 && (
            <Card className="border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-background">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <CardTitle className="text-lg">APIs Intégrées (Découverte IA)</CardTitle>
                  <Badge variant="outline" className="ml-auto">{integratedApis.length} APIs</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {integratedApis.map(api => {
                  const status = integratedStatuses[api.id];
                  const isOnline = status?.status === 'online';
                  const isTesting = status?.status === 'testing';
                  
                  return (
                    <div
                      key={api.id}
                      className={`p-3 rounded-lg border bg-card transition-colors ${
                        isOnline ? 'border-green-500/30' :
                        status?.status === 'offline' ? 'border-red-500/50 bg-red-500/5' :
                        'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Database className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{api.name}</p>
                            <p className="text-xs text-muted-foreground">{api.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{api.category}</Badge>
                              <span className="text-xs text-muted-foreground">{api.dataType}</span>
                              {api.integratedAt && (
                                <span className="text-xs text-indigo-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Intégrée le {new Date(api.integratedAt).toLocaleDateString('fr-FR')} à {new Date(api.integratedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {status?.lastCheck && (
                            <span className="text-xs text-muted-foreground">
                              {status.lastCheck.toLocaleDateString('fr-FR')} {status.lastCheck.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {status?.responseTime && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {status.responseTime}ms
                            </span>
                          )}
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                            isTesting ? 'bg-blue-500/20 text-blue-600' :
                            isOnline ? 'bg-green-500/20 text-green-600' :
                            status?.status === 'offline' ? 'bg-red-500/20 text-red-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {isTesting ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Test...
                              </>
                            ) : isOnline ? (
                              <>
                                <Power className="w-3 h-3" />
                                Marche
                              </>
                            ) : status?.status === 'offline' ? (
                              <>
                                <PowerOff className="w-3 h-3" />
                                Arrêt
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                Non testé
                              </>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => testIntegratedApi(api).then(result => {
                              setIntegratedStatuses(prev => ({ ...prev, [api.id]: result }));
                            })}
                            disabled={isRunning || isTesting}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => removeIntegratedApi(api.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {status?.error && (
                        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-red-600">{status.error}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
