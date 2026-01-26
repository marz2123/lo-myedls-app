import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Database, Sparkles, CheckCircle, Loader2, FileSpreadsheet, RefreshCw, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ImportStats {
  familles: number;
  categories: number;
  sousCategories: number;
  taches: number;
}

interface EnrichmentProgress {
  processed: number;
  remaining: number;
  total: number;
}

export function DSCImporter() {
  const { t } = useLanguage();
  const [isImporting, setIsImporting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress | null>(null);
  const [dscStats, setDscStats] = useState<ImportStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDSCStats = async () => {
    try {
      const [ftResult, ctResult, scResult, tResult] = await Promise.all([
        supabase.from('ft_familles').select('id', { count: 'exact', head: true }),
        supabase.from('ct_categories').select('id', { count: 'exact', head: true }),
        supabase.from('sc_sous_categories').select('id', { count: 'exact', head: true }),
        supabase.from('t_taches').select('id', { count: 'exact', head: true }),
      ]);

      setDscStats({
        familles: ftResult.count || 0,
        categories: ctResult.count || 0,
        sousCategories: scResult.count || 0,
        taches: tResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading DSC stats:', error);
    }
  };

  useState(() => {
    loadDSCStats();
  });

  // Import from structured Excel (4 sheets)
  const handleImportFromExcel = async () => {
    setIsImporting(true);
    setImportStats(null);

    try {
      // Fetch the Excel file
      const response = await fetch('/data/DSC_structuree_MyEDLS.xlsx');
      if (!response.ok) throw new Error('Fichier DSC_structuree_MyEDLS.xlsx non trouvé');
      
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      toast.info('Import en cours... (~17 000 tâches)', { duration: 10000 });
      
      const { data, error } = await supabase.functions.invoke('import-dsc', {
        body: { excelBase64: base64, clearExisting: true }
      });

      if (error) throw error;

      if (data.success) {
        setImportStats(data.stats);
        toast.success(`DSC importée: ${data.stats.familles} FT, ${data.stats.categories} CT, ${data.stats.sousCategories} SC, ${data.stats.taches} T`);
        loadDSCStats();
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Erreur d'import: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Handle file upload (CSV or XLSX)
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      toast.error('Veuillez sélectionner un fichier CSV ou Excel (.xlsx)');
      return;
    }

    setIsImporting(true);
    setImportStats(null);

    try {
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        const { data, error } = await supabase.functions.invoke('import-dsc', {
          body: { excelBase64: base64, clearExisting: true }
        });

        if (error) throw error;
        if (data.success) {
          setImportStats(data.stats);
          toast.success(`DSC importée: ${data.stats.familles} FT, ${data.stats.categories} CT, ${data.stats.sousCategories} SC, ${data.stats.taches} T`);
          loadDSCStats();
        } else {
          throw new Error(data.error || 'Erreur inconnue');
        }
      } else {
        // CSV import
        const csvContent = await file.text();
        const { data, error } = await supabase.functions.invoke('import-dsc', {
          body: { csvContent, clearExisting: true }
        });

        if (error) throw error;
        if (data.success) {
          setImportStats(data.stats);
          toast.success(`DSC importée: ${data.stats.familles} FT, ${data.stats.categories} CT, ${data.stats.sousCategories} SC, ${data.stats.taches} T`);
          loadDSCStats();
        } else {
          throw new Error(data.error || 'Erreur inconnue');
        }
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Erreur d'import: ${error.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEnrichWithAI = async () => {
    setIsEnriching(true);
    
    try {
      const { count: total } = await supabase
        .from('sc_sous_categories')
        .select('id', { count: 'exact', head: true })
        .is('keywords_ia', null);

      if (!total || total === 0) {
        toast.info('Toutes les sous-catégories sont déjà enrichies');
        setIsEnriching(false);
        return;
      }

      setEnrichmentProgress({ processed: 0, remaining: total, total });

      let offset = 0;
      let remaining = total;
      
      while (remaining > 0) {
        const { data, error } = await supabase.functions.invoke('enrich-dsc-ai', {
          body: { batchSize: 30, offset }
        });

        if (error) throw error;

        if (data.success) {
          remaining = data.remaining;
          offset = data.nextOffset;
          setEnrichmentProgress({
            processed: total - remaining,
            remaining,
            total
          });
          
          if (remaining === 0) {
            toast.success('Enrichissement IA terminé !');
            break;
          }
        } else {
          throw new Error(data.error || 'Erreur enrichissement');
        }
      }

      loadDSCStats();
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast.error(`Erreur d'enrichissement: ${error.message}`);
    } finally {
      setIsEnriching(false);
      setEnrichmentProgress(null);
    }
  };

  const isFr = t('cancel') === 'Annuler';

  return (
    <div className="space-y-6">
      {/* Current DSC Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">
                {isFr ? 'DSC Actuelle (FT/CT/SC/T)' : 'Current DSC (FT/CT/SC/T)'}
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={loadDSCStats}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dscStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{dscStats.familles}</div>
                <div className="text-xs text-muted-foreground">FT (Familles)</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{dscStats.categories}</div>
                <div className="text-xs text-muted-foreground">CT (Catégories)</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{dscStats.sousCategories}</div>
                <div className="text-xs text-muted-foreground">SC (Sous-catégories)</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{dscStats.taches.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">T (Tâches)</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              {isFr ? 'Chargement...' : 'Loading...'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">
              {isFr ? 'Importer DSC structurée' : 'Import Structured DSC'}
            </CardTitle>
          </div>
          <CardDescription>
            {isFr 
              ? 'Importez le fichier Excel structuré GPT avec 4 feuilles (FT, CT, SC, T) ou un CSV legacy'
              : 'Import GPT structured Excel file with 4 sheets (FT, CT, SC, T) or legacy CSV'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex gap-2 flex-col sm:flex-row">
              {/* Main button - Import structured Excel */}
              <Button
                onClick={handleImportFromExcel}
                disabled={isImporting}
                className="flex-1"
                size="lg"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isFr ? 'Import en cours...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    {isFr ? 'Importer DSC GPT structurée' : 'Import GPT Structured DSC'}
                  </>
                )}
              </Button>
              
              {/* Secondary - Upload custom file */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                variant="outline"
                size="lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isFr ? 'Autre fichier' : 'Other file'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {isFr 
                ? '⚠️ L\'import remplacera TOUTES les données DSC existantes'
                : '⚠️ Import will REPLACE ALL existing DSC data'}
            </p>

            {isImporting && (
              <div className="space-y-2">
                <Progress value={50} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {isFr ? 'Traitement des ~17 000 tâches...' : 'Processing ~17,000 tasks...'}
                </p>
              </div>
            )}

            {importStats && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {isFr ? 'Import réussi !' : 'Import successful!'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><Badge variant="secondary">{importStats.familles} FT</Badge> {isFr ? 'familles' : 'families'}</div>
                  <div><Badge variant="secondary">{importStats.categories} CT</Badge> {isFr ? 'catégories' : 'categories'}</div>
                  <div><Badge variant="secondary">{importStats.sousCategories} SC</Badge> {isFr ? 'sous-cat.' : 'subcategories'}</div>
                  <div><Badge variant="secondary">{importStats.taches.toLocaleString()} T</Badge> {isFr ? 'tâches' : 'tasks'}</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Enrichment Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">
              {isFr ? 'Enrichissement IA des métadonnées' : 'AI Metadata Enrichment'}
            </CardTitle>
          </div>
          <CardDescription>
            {isFr 
              ? 'Génère automatiquement zone_type, corps_metier, phase_chantier, pieces_typiques et keywords_ia pour chaque sous-catégorie'
              : 'Automatically generates zone_type, corps_metier, phase_chantier, pieces_typiques and keywords_ia for each subcategory'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleEnrichWithAI}
              disabled={isEnriching || !dscStats || dscStats.sousCategories === 0}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isFr ? 'Enrichissement en cours...' : 'Enriching...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isFr ? 'Lancer l\'enrichissement IA' : 'Start AI Enrichment'}
                </>
              )}
            </Button>

            {enrichmentProgress && (
              <div className="space-y-2">
                <Progress 
                  value={(enrichmentProgress.processed / enrichmentProgress.total) * 100} 
                  className="h-2" 
                />
                <p className="text-sm text-center text-muted-foreground">
                  {enrichmentProgress.processed} / {enrichmentProgress.total} SC {isFr ? 'enrichies' : 'enriched'}
                  {' '}({Math.round((enrichmentProgress.processed / enrichmentProgress.total) * 100)}%)
                </p>
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-2">{isFr ? 'Champs générés par l\'IA :' : 'AI-generated fields:'}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <code>zone_type</code> - mur, sol, plafond, facade...</li>
                <li>• <code>corps_metier</code> - maconnerie, plomberie_cvc...</li>
                <li>• <code>phase_chantier</code> - gros_oeuvre, finitions...</li>
                <li>• <code>pieces_typiques</code> - ["sdb", "cuisine"]</li>
                <li>• <code>keywords_ia</code> - {isFr ? 'mots terrain pour matching' : 'field keywords for matching'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
