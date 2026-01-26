import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  SkipForward, 
  CheckCircle2, 
  Zap,
  Timer,
  AlertTriangle
} from 'lucide-react';
import type { MultiunitUnit } from '@/types/multiunit';
import { APARTMENT_TYPE_LABELS, EDL_STATUS_LABELS } from '@/types/multiunit';
import { cn } from '@/lib/utils';

interface SeriesModePanelProps {
  units: MultiunitUnit[];
  currentIndex: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function SeriesModePanel({
  units,
  currentIndex,
  isRunning,
  onStart,
  onPause,
  onSkip,
  onComplete
}: SeriesModePanelProps) {
  const currentUnit = units[currentIndex];
  const nextUnit = units[currentIndex + 1];
  const completedCount = currentIndex;
  const remainingCount = units.length - currentIndex - 1;
  const progressPercent = units.length > 0 ? Math.round((currentIndex / units.length) * 100) : 0;

  // Estimated time (assuming 5 min per unit)
  const estimatedMinutes = remainingCount * 5;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Mode Série</CardTitle>
          </div>
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            {isRunning ? 'En cours' : 'En pause'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>{completedCount} / {units.length} lots</span>
            <span className="text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Current Unit */}
        {currentUnit && (
          <div className="p-3 rounded-lg bg-background border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Lot actuel</p>
                <p className="font-semibold">{currentUnit.unit_number}</p>
                <p className="text-xs text-muted-foreground">
                  Étage {currentUnit.floor_number}
                  {currentUnit.apartment_type && ` • ${APARTMENT_TYPE_LABELS[currentUnit.apartment_type]}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {currentUnit.is_template && (
                  <Badge variant="secondary" className="text-xs">Modèle</Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next Unit Preview */}
        {nextUnit && (
          <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Prochain</p>
                <p className="font-medium text-sm">{nextUnit.unit_number}</p>
              </div>
              {nextUnit.similarity_score && nextUnit.similarity_score > 0.8 && (
                <Badge variant="outline" className="text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Similaire
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Time Estimate */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="h-4 w-4" />
          <span>~{estimatedMinutes} min restantes</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <Button onClick={onStart} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              {currentIndex === 0 ? 'Démarrer' : 'Reprendre'}
            </Button>
          ) : (
            <Button onClick={onPause} variant="secondary" className="flex-1">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          <Button onClick={onSkip} variant="outline" disabled={!isRunning}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Terminés</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">1</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-muted-foreground">{remainingCount}</p>
            <p className="text-xs text-muted-foreground">Restants</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
