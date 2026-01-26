import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Rewind, 
  FastForward, 
  Plus,
  Sparkles,
  Download,
  Settings2,
  Maximize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTimeWarp } from '@/hooks/useTimeWarp';
import { TimeWarpTimeline } from './TimeWarpTimeline';
import { TimeWarpViewer3D } from './TimeWarpViewer3D';
import { TimeWarpControls } from './TimeWarpControls';
import { TimeWarpDegradationPanel } from './TimeWarpDegradationPanel';
import { cn } from '@/lib/utils';

interface TimeWarpEngineProps {
  projectId: string;
  onClose?: () => void;
}

export function TimeWarpEngine({ projectId, onClose }: TimeWarpEngineProps) {
  const {
    snapshots,
    transitions,
    predictions,
    selectedSnapshot,
    compareSnapshot,
    timelinePoints,
    availableYears,
    degradationSummary,
    isLoading,
    viewerState,
    setViewerState,
    selectYear,
    enableCompareMode,
    exitCompareMode,
    createSnapshot,
    generatePrediction,
    playTimeline,
    pauseTimeline,
    setPlaybackSpeed,
  } = useTimeWarp({ projectId });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newSnapshotYear, setNewSnapshotYear] = useState(new Date().getFullYear());
  const [newPredictionYear, setNewPredictionYear] = useState(new Date().getFullYear() + 5);
  const [activeTab, setActiveTab] = useState('viewer');

  const handlePrevious = () => {
    const currentIndex = availableYears.indexOf(viewerState.selectedYear);
    if (currentIndex > 0) {
      selectYear(availableYears[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = availableYears.indexOf(viewerState.selectedYear);
    if (currentIndex < availableYears.length - 1) {
      selectYear(availableYears[currentIndex + 1]);
    }
  };

  const handlePlayPause = () => {
    if (viewerState.isPlaying) {
      pauseTimeline();
    } else {
      playTimeline();
    }
  };

  const handleEnableCompareMode = () => {
    // Enable compare mode and select the first available year that's not the current one
    const otherYears = availableYears.filter(y => y !== viewerState.selectedYear);
    if (otherYears.length > 0) {
      enableCompareMode(otherYears[0]);
    }
  };

  const handleReset = () => {
    setViewerState(prev => ({
      ...prev,
      cameraPosition: { x: 0, y: 5, z: 10 },
      mode: 'single',
    }));
    exitCompareMode();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Clock className="h-12 w-12 text-primary mx-auto" />
          </motion.div>
          <p className="text-muted-foreground">Chargement de TimeWarp...</p>
        </div>
      </div>
    );
  }

  const ViewerContent = (
    <div className={cn(
      "relative",
      isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-[500px]"
    )}>
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            TimeWarp
          </Badge>
          {selectedSnapshot && (
            <Badge variant="outline">
              {selectedSnapshot.snapshot_year}
              {selectedSnapshot.snapshot_type === 'predicted' && (
                <Sparkles className="h-3 w-3 ml-1 text-amber-500" />
              )}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 3D Viewer */}
      <TimeWarpViewer3D
        snapshot={selectedSnapshot}
        compareSnapshot={compareSnapshot}
        showAnomalies={viewerState.showAnomalies}
        showFurniture={viewerState.showFurniture}
        isCompareMode={viewerState.mode === 'compare'}
      />

      {/* Timeline at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-transparent p-4">
        <TimeWarpTimeline
          points={timelinePoints}
          selectedYear={viewerState.selectedYear}
          compareYear={viewerState.compareYear}
          onSelectYear={selectYear}
          onCompare={enableCompareMode}
          isCompareMode={viewerState.mode === 'compare'}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="viewer" className="gap-1">
              <Clock className="h-4 w-4" />
              Visualiseur
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-1">
              <Sparkles className="h-4 w-4" />
              Analyse
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {/* Add snapshot dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Snapshot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un snapshot</DialogTitle>
                  <DialogDescription>
                    Enregistrez l'état actuel du bien pour une année donnée
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Année</Label>
                    <Input
                      id="year"
                      type="number"
                      value={newSnapshotYear}
                      onChange={(e) => setNewSnapshotYear(parseInt(e.target.value))}
                      min={1900}
                      max={2100}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createSnapshot(newSnapshotYear)}>
                    Créer le snapshot
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Generate prediction dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Sparkles className="h-4 w-4" />
                  Prédiction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Générer une prédiction IA</DialogTitle>
                  <DialogDescription>
                    L'IA prédit l'état futur du bien basé sur l'historique
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="predYear">Année cible</Label>
                    <Input
                      id="predYear"
                      type="number"
                      value={newPredictionYear}
                      onChange={(e) => setNewPredictionYear(parseInt(e.target.value))}
                      min={new Date().getFullYear()}
                      max={2050}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => generatePrediction(newPredictionYear)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="viewer" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main viewer */}
            <div className="lg:col-span-3">
              <Card className="overflow-hidden">
                {ViewerContent}
              </Card>
            </div>

            {/* Controls sidebar */}
            <div className="space-y-4">
              <TimeWarpControls
                viewerState={viewerState}
                availableYears={availableYears}
                onPlayPause={handlePlayPause}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onSpeedChange={setPlaybackSpeed}
                onToggleAnomalies={() => setViewerState(prev => ({ 
                  ...prev, 
                  showAnomalies: !prev.showAnomalies 
                }))}
                onToggleFurniture={() => setViewerState(prev => ({ 
                  ...prev, 
                  showFurniture: !prev.showFurniture 
                }))}
                onToggleEnergy={() => setViewerState(prev => ({ 
                  ...prev, 
                  showEnergy: !prev.showEnergy 
                }))}
                onTogglePredictions={() => setViewerState(prev => ({ 
                  ...prev, 
                  showPredictions: !prev.showPredictions 
                }))}
                onEnableCompareMode={handleEnableCompareMode}
                onExitCompareMode={exitCompareMode}
                onReset={handleReset}
              />

              {/* Quick stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Statistiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Snapshots</span>
                    <Badge variant="outline">{snapshots.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prédictions</span>
                    <Badge variant="outline">{predictions.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transitions</span>
                    <Badge variant="outline">{transitions.length}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TimeWarpDegradationPanel
              degradationSummary={degradationSummary}
              transitions={transitions}
              predictions={predictions}
            />

            {/* Room history placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historique par pièce
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8 text-muted-foreground">
                <p>Sélectionnez une pièce dans le visualiseur 3D</p>
                <p className="text-xs mt-1">pour voir son évolution détaillée</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
