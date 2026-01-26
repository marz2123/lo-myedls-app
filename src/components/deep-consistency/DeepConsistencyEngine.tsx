import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  ArrowLeft, 
  Play,
  Filter,
  Download,
  Settings,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConsistencyScoreCard } from './ConsistencyScoreCard';
import { InconsistencyList } from './InconsistencyList';
import { AutoCorrectPanel } from './AutoCorrectPanel';
import { useDeepConsistency, InconsistencyItem } from '@/hooks/useDeepConsistency';
import { cn } from '@/lib/utils';

interface DeepConsistencyEngineProps {
  projectId: string;
  sessionId?: string;
  onBack?: () => void;
}

export const DeepConsistencyEngine = ({
  projectId,
  sessionId,
  onBack,
}: DeepConsistencyEngineProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InconsistencyItem | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const {
    isAnalyzing,
    analysisResult,
    inconsistencies,
    startAnalysis,
    fetchAnalysisResult,
    applyCorrection,
    applyAllCorrections,
    dismissInconsistency,
    getTypeLabel,
    getCategoryLabel,
    pendingCount,
    criticalCount,
    autoCorrectableCount,
  } = useDeepConsistency({ projectId, sessionId });

  useEffect(() => {
    fetchAnalysisResult();
  }, [fetchAnalysisResult]);

  const handleViewDetail = (item: InconsistencyItem) => {
    setSelectedItem(item);
    setShowDetailSheet(true);
  };

  const filteredInconsistencies = inconsistencies.filter(item => {
    if (filterSeverity !== 'all' && item.severity !== filterSeverity) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    return true;
  });

  const categories = [...new Set(inconsistencies.map(i => i.category))];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Analyse IA Avancée</h1>
            </div>
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} critiques</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={startAnalysis}
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Lancer l'analyse
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="issues" className="relative">
              Incohérences
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="correct">Corrections</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <ConsistencyScoreCard
                score={analysisResult?.overall_score || 0}
                summary={analysisResult?.analysis_summary}
                photoDescriptionScore={analysisResult?.photo_description_score}
                stateAnomalyScore={analysisResult?.state_anomaly_score}
                writingQualityScore={analysisResult?.writing_quality_score}
                photoCoverageScore={analysisResult?.photo_coverage_score}
                totalInconsistencies={analysisResult?.total_inconsistencies || 0}
                criticalCount={analysisResult?.critical_count || 0}
                warningCount={analysisResult?.warning_count || 0}
                infoCount={analysisResult?.info_count || 0}
                isAnalyzing={isAnalyzing}
              />

              <div className="space-y-4">
                <AutoCorrectPanel
                  autoCorrectableCount={autoCorrectableCount}
                  totalInconsistencies={analysisResult?.total_inconsistencies || 0}
                  appliedCorrections={analysisResult?.auto_corrections_applied || 0}
                  onApplyAll={applyAllCorrections}
                  onRefreshAnalysis={startAnalysis}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            </motion.div>

            {/* Quick Actions */}
            {!analysisResult && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <Brain className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Aucune analyse récente</h2>
                <p className="text-muted-foreground mb-6">
                  Lancez une analyse IA pour détecter les incohérences dans votre EDL
                </p>
                <Button onClick={startAnalysis} size="lg" className="gap-2">
                  <Sparkles className="h-5 w-5" />
                  Démarrer l'analyse IA
                </Button>
              </motion.div>
            )}
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtrer:</span>
              </div>
              
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sévérité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="critical">Critiques</SelectItem>
                  <SelectItem value="warning">Alertes</SelectItem>
                  <SelectItem value="info">Infos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="outline" className="ml-auto">
                {filteredInconsistencies.filter(i => !i.is_corrected && !i.is_dismissed).length} résultats
              </Badge>
            </div>

            <InconsistencyList
              items={filteredInconsistencies}
              onApplyCorrection={applyCorrection}
              onDismiss={dismissInconsistency}
              onViewDetail={handleViewDetail}
              getTypeLabel={getTypeLabel}
              getCategoryLabel={getCategoryLabel}
            />
          </TabsContent>

          {/* Corrections Tab */}
          <TabsContent value="correct" className="space-y-6">
            <div className="max-w-xl mx-auto">
              <AutoCorrectPanel
                autoCorrectableCount={autoCorrectableCount}
                totalInconsistencies={analysisResult?.total_inconsistencies || 0}
                appliedCorrections={analysisResult?.auto_corrections_applied || 0}
                onApplyAll={applyAllCorrections}
                onRefreshAnalysis={startAnalysis}
                isAnalyzing={isAnalyzing}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedItem && (
                <>
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    selectedItem.severity === 'critical' && "bg-red-500",
                    selectedItem.severity === 'warning' && "bg-orange-500",
                    selectedItem.severity === 'info' && "bg-blue-500"
                  )} />
                  {selectedItem.title}
                </>
              )}
            </SheetTitle>
          </SheetHeader>

          {selectedItem && (
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
              </div>

              {selectedItem.photo_url && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Photo concernée</h4>
                  <img 
                    src={selectedItem.photo_url} 
                    alt="Photo" 
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {selectedItem.original_text && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Texte original</h4>
                  <p className="text-sm p-3 bg-muted rounded-lg">{selectedItem.original_text}</p>
                </div>
              )}

              {selectedItem.suggested_correction && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-green-600">Suggestion IA</h4>
                  <p className="text-sm p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-green-700 dark:text-green-300">
                    {selectedItem.suggested_correction}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4">
                {selectedItem.auto_correctable && selectedItem.suggested_correction && (
                  <Button
                    onClick={() => {
                      applyCorrection(selectedItem.id, selectedItem.suggested_correction!);
                      setShowDetailSheet(false);
                    }}
                    className="flex-1"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Appliquer la correction
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    dismissInconsistency(selectedItem.id);
                    setShowDetailSheet(false);
                  }}
                >
                  Ignorer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
