import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Layers, 
  Eye, 
  EyeOff,
  Sofa,
  AlertTriangle,
  Zap,
  Sparkles,
  SplitSquareVertical,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TimeWarpViewerState } from '@/types/timewarp';

interface TimeWarpControlsProps {
  viewerState: TimeWarpViewerState;
  availableYears: number[];
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleAnomalies: () => void;
  onToggleFurniture: () => void;
  onToggleEnergy: () => void;
  onTogglePredictions: () => void;
  onEnableCompareMode: () => void;
  onExitCompareMode: () => void;
  onReset: () => void;
}

export function TimeWarpControls({
  viewerState,
  availableYears,
  onPlayPause,
  onPrevious,
  onNext,
  onSpeedChange,
  onToggleAnomalies,
  onToggleFurniture,
  onToggleEnergy,
  onTogglePredictions,
  onEnableCompareMode,
  onExitCompareMode,
  onReset,
}: TimeWarpControlsProps) {
  const currentIndex = availableYears.indexOf(viewerState.selectedYear);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 p-4 bg-card rounded-xl border">
        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onPrevious}
                disabled={currentIndex <= 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Année précédente</TooltipContent>
          </Tooltip>

          <Button
            variant="default"
            size="lg"
            className="h-12 w-12 rounded-full"
            onClick={onPlayPause}
          >
            {viewerState.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onNext}
                disabled={currentIndex >= availableYears.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Année suivante</TooltipContent>
          </Tooltip>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">Vitesse</span>
          <Slider
            value={[viewerState.playbackSpeed]}
            onValueChange={([value]) => onSpeedChange(value)}
            min={0.5}
            max={3}
            step={0.5}
            className="flex-1"
          />
          <Badge variant="secondary" className="w-12 justify-center">
            {viewerState.playbackSpeed}x
          </Badge>
        </div>

        <Separator />

        {/* View toggles */}
        <div className="flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={viewerState.showAnomalies}
                onPressedChange={onToggleAnomalies}
                size="sm"
                className="gap-1"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Anomalies</span>
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Afficher les anomalies</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={viewerState.showFurniture}
                onPressedChange={onToggleFurniture}
                size="sm"
                className="gap-1"
              >
                <Sofa className="h-4 w-4" />
                <span className="text-xs">Mobilier</span>
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Afficher le mobilier</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={viewerState.showEnergy}
                onPressedChange={onToggleEnergy}
                size="sm"
                className="gap-1"
              >
                <Zap className="h-4 w-4" />
                <span className="text-xs">Énergie</span>
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Afficher les données énergétiques</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={viewerState.showPredictions}
                onPressedChange={onTogglePredictions}
                size="sm"
                className="gap-1"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">Prévisions</span>
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Afficher les prévisions IA</TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        {/* Mode controls */}
        <div className="flex gap-2">
          {viewerState.mode === 'compare' ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 gap-1"
              onClick={onExitCompareMode}
            >
              <Eye className="h-4 w-4" />
              Vue simple
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={onEnableCompareMode}
            >
              <SplitSquareVertical className="h-4 w-4" />
              Comparer
            </Button>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Réinitialiser la vue</TooltipContent>
          </Tooltip>
        </div>

        {/* Current state indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            <span>Mode: {viewerState.mode === 'compare' ? 'Comparaison' : 'Simple'}</span>
          </div>
          <Badge variant="outline">
            {viewerState.selectedYear}
            {viewerState.compareYear && ` vs ${viewerState.compareYear}`}
          </Badge>
        </div>
      </div>
    </TooltipProvider>
  );
}
