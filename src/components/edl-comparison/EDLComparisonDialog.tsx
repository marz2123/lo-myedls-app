import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowLeftRight, 
  Loader2, 
  CheckCircle2,
  Save,
  FileText,
  ChevronLeft
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEDLComparison, DetectedDifference } from '@/hooks/useEDLComparison';
import { ComparisonViewer } from './ComparisonViewer';
import { DifferenceCard } from './DifferenceCard';
import { DegradationSummary } from './DegradationSummary';

interface EDLComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  entrySessionId: string;
  exitSessionId: string;
}

type ViewState = 'loading' | 'results' | 'detail' | 'summary';

export function EDLComparisonDialog({
  open,
  onOpenChange,
  projectId,
  entrySessionId,
  exitSessionId
}: EDLComparisonDialogProps) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [selectedDifference, setSelectedDifference] = useState<DetectedDifference | null>(null);
  
  const {
    isComparing,
    comparisonResult,
    progress,
    comparePhotos,
    approveDifference,
    toggleTask,
    approveAll,
    saveComparison
  } = useEDLComparison(projectId);

  useEffect(() => {
    if (open && !comparisonResult) {
      setViewState('loading');
      comparePhotos(entrySessionId, exitSessionId).then(() => {
        setViewState('results');
      }).catch(() => {
        setViewState('results');
      });
    }
  }, [open, entrySessionId, exitSessionId]);

  useEffect(() => {
    if (comparisonResult && !isComparing) {
      setViewState('results');
    }
  }, [comparisonResult, isComparing]);

  const handleViewComparison = (diff: DetectedDifference) => {
    setSelectedDifference(diff);
    setViewState('detail');
  };

  const handleSave = async () => {
    await saveComparison();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {viewState === 'detail' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewState('results')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="p-2 rounded-xl bg-primary/10">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">
                {viewState === 'loading' && 'Comparaison en cours...'}
                {viewState === 'results' && 'Comparaison Entrée / Sortie'}
                {viewState === 'detail' && 'Détail de la différence'}
                {viewState === 'summary' && 'Synthèse des dégradations'}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            <AnimatePresence mode="wait">
              {/* Loading State */}
              {viewState === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 space-y-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold">Analyse IA en cours</h3>
                    <p className="text-sm text-muted-foreground">
                      Comparaison des photos entrée/sortie...
                    </p>
                  </div>
                  <div className="w-full max-w-xs space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {progress}% complété
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Results List */}
              {viewState === 'results' && comparisonResult && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Quick Summary */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {comparisonResult.differences.length} différence(s) détectée(s)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comparisonResult.tasks.length} tâches suggérées
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewState('summary')}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Synthèse
                      </Button>
                    </div>
                  </div>

                  {/* Differences List */}
                  {comparisonResult.differences.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">Aucune dégradation détectée</h3>
                      <p className="text-sm text-muted-foreground">
                        Le bien est dans le même état qu'à l'entrée
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comparisonResult.differences.map(diff => (
                        <DifferenceCard
                          key={diff.id}
                          difference={diff}
                          tasks={comparisonResult.tasks}
                          onApprove={(approved) => approveDifference(diff.id, approved)}
                          onToggleTask={toggleTask}
                          onViewComparison={() => handleViewComparison(diff)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Detail View */}
              {viewState === 'detail' && selectedDifference && (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <ComparisonViewer
                    entryPhotoUrl={selectedDifference.entryPhotoUrl}
                    exitPhotoUrl={selectedDifference.exitPhotoUrl}
                    roomName={selectedDifference.roomName}
                    elementType={selectedDifference.elementType}
                    highlightBox={selectedDifference.boundingBox}
                  />
                </motion.div>
              )}

              {/* Summary View */}
              {viewState === 'summary' && comparisonResult && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewState('results')}
                    className="mb-4 gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour aux résultats
                  </Button>
                  <DegradationSummary result={comparisonResult} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {viewState === 'results' && comparisonResult && comparisonResult.differences.length > 0 && (
          <div className="p-4 border-t border-border space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={approveAll}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Tout approuver
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
