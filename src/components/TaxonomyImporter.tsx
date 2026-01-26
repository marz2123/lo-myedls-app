import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle2, Loader2, Lock, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { parseTaxonomyText, parseTaxonomyCSV, parseTaxonomyExcel } from "@/utils/parseTaxonomy";
import { Progress } from "@/components/ui/progress";
import { ImportHistory } from "./ImportHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const TaxonomyImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProgressId, setCurrentProgressId] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<{
    families: number;
    categories: number;
    subcategories: number;
    tasks: number;
  } | null>(null);
  const [showImportModeDialog, setShowImportModeDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isAdmin, loading } = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to realtime import progress updates
  useEffect(() => {
    const channel = supabase
      .channel('import-progress-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_progress'
        },
        (payload) => {
          console.log('Import progress update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as any;
            
            setProgress(record.progress_percentage);
            setImportStats({
              families: record.families_count || 0,
              categories: record.categories_count || 0,
              subcategories: record.subcategories_count || 0,
              tasks: record.tasks_count || 0
            });

            if (record.status === 'completed') {
              setIsImporting(false);
              setIsImported(true);
              setCurrentProgressId(null);
              toast({
                title: `✅ ${t('importSuccess')}`,
                description: `${record.families_count} familles, ${record.categories_count} catégories, ${record.subcategories_count} sous-catégories, ${record.tasks_count || 0} tâches`,
              });
            } else if (record.status === 'failed' || record.status === 'cancelled') {
              setIsImporting(false);
              setCurrentProgressId(null);
              toast({
                title: record.status === 'cancelled' ? '⚠️ Import annulé' : `❌ ${t('importError')}`,
                description: record.error_message || "Une erreur s'est produite",
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, t]);

  // Check if there's existing taxonomy data
  useEffect(() => {
    const checkExistingData = async () => {
      const { count } = await supabase
        .from('task_families')
        .select('*', { count: 'exact', head: true });
      
      setHasExistingData((count || 0) > 0);
    };
    
    checkExistingData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // If there's existing data, show mode selection dialog
    if (hasExistingData) {
      setPendingFile(file);
      setShowImportModeDialog(true);
      return;
    }

    // No existing data, proceed with replace mode
    await processImport(file, 'replace');
  };

  const processImport = async (file: File, mode: 'replace' | 'merge') => {
    setIsImporting(true);
    setProgress(0);
    setImportStats(null);
    setCurrentProgressId(null);
    setShowImportModeDialog(false);
    
    try {
      // Detect file format and parse accordingly
      let taxonomyData;
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        taxonomyData = await parseTaxonomyExcel(file);
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text();
        taxonomyData = parseTaxonomyCSV(text);
      } else {
        const text = await file.text();
        taxonomyData = parseTaxonomyText(text);
      }

      if (taxonomyData.length === 0) {
        throw new Error("Aucune donnée valide trouvée dans le fichier");
      }

      const { data, error } = await supabase.functions.invoke('import-taxonomy', {
        body: { 
          taxonomyData,
          mode // 'replace' or 'merge'
        }
      });

      if (error) throw error;

      // For small imports that complete immediately
      if (data.imported) {
        setIsImported(true);
        setProgress(100);
        setImportStats(data.imported);
        setIsImporting(false);
        toast({
          title: `✅ ${t('importSuccess')}`,
          description: `${data.imported.families} familles, ${data.imported.categories} catégories, ${data.imported.subcategories} sous-catégories, ${data.imported.tasks || 0} tâches`,
        });
      } else if (data.processing) {
        // For large imports, progress will be tracked via realtime
        setCurrentProgressId(data.progressId);
        toast({
          title: "Import en cours",
          description: data.message,
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setIsImporting(false);
      toast({
        title: `❌ ${t('importError')}`,
        description: error instanceof Error ? error.message : "Veuillez réessayer",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelImport = async () => {
    if (!currentProgressId) return;

    try {
      const { error } = await supabase
        .from('import_progress')
        .update({ status: 'cancelled', error_message: 'Import annulé par l\'utilisateur' })
        .eq('id', currentProgressId);

      if (error) throw error;

      setIsImporting(false);
      setCurrentProgressId(null);
      toast({
        title: "Import annulé",
        description: "L'import a été annulé avec succès",
      });
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler l'import",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <Card className="p-6 bg-muted/50 border-border">
        <div className="flex items-center gap-3">
          <Lock className="w-6 h-6 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-foreground">{t('importStructure')}</h3>
            <p className="text-sm text-muted-foreground">{t('adminOnly')}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (isImported) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">✅ {t('structureLoaded')}</h3>
            <p className="text-sm text-green-700">{t('structureLoadedDesc')}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground mb-1">{t('importStructureTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('importStructureDesc')}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="taxonomy-file-input"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('importing')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importer la structure DSC
                  </>
                )}
              </Button>
              {isImporting && (
                <Button
                  onClick={handleCancelImport}
                  variant="destructive"
                  size="icon"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar with shimmer effect */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progression de l'import</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="relative">
                <Progress value={progress} className="h-2" />
                {/* Shimmer overlay */}
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              </div>
              
              {importStats && (
                <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                  <span className="animate-fade-in">{importStats.families} familles</span>
                  <span className="animate-fade-in">{importStats.categories} catégories</span>
                  <span className="animate-fade-in">{importStats.subcategories} sous-catégories</span>
                  <span className="animate-fade-in">{importStats.tasks} tâches</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Import Mode Selection Dialog */}
      <AlertDialog open={showImportModeDialog} onOpenChange={setShowImportModeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Mode d'import de la structure DSC
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Des données DSC existent déjà dans le système. Comment souhaitez-vous procéder ?
              </p>
              <div className="space-y-3 mt-4">
                <div className="p-3 border border-border rounded-lg bg-card">
                  <h4 className="font-medium text-foreground mb-1">✏️ Écraser l'ancienne structure</h4>
                  <p className="text-sm text-muted-foreground">
                    Supprime complètement l'ancienne structure et la remplace par la nouvelle.
                  </p>
                </div>
                <div className="p-3 border border-border rounded-lg bg-card">
                  <h4 className="font-medium text-foreground mb-1">🔀 Compléter avec fusion intelligente</h4>
                  <p className="text-sm text-muted-foreground">
                    L'IA analyse l'existant et le nouveau fichier pour créer une structure complète sans doublon ni incohérence.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}>
              Annuler
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingFile) processImport(pendingFile, 'replace');
              }}
            >
              Écraser
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (pendingFile) processImport(pendingFile, 'merge');
              }}
            >
              Compléter (IA)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import History */}
      <ImportHistory />
    </div>
  );
};