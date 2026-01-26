import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { TimeWarpTransition, TimeWarpPrediction } from '@/types/timewarp';
import { CONDITION_COLORS, DEGRADATION_COLORS } from '@/types/timewarp';

interface TimeWarpDegradationPanelProps {
  degradationSummary: {
    totalYears: number;
    initialScore: number;
    currentScore: number;
    totalDegradation: number;
    annualDegradationRate: number;
    level: 'stable' | 'slow' | 'rapid';
  } | null;
  transitions: TimeWarpTransition[];
  predictions: TimeWarpPrediction[];
}

export function TimeWarpDegradationPanel({
  degradationSummary,
  transitions,
  predictions,
}: TimeWarpDegradationPanelProps) {
  if (!degradationSummary) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Pas assez de données pour l'analyse de dégradation</p>
          <p className="text-xs mt-1">Créez au moins 2 EDL pour voir l'évolution</p>
        </CardContent>
      </Card>
    );
  }

  const getLevelIcon = () => {
    switch (degradationSummary.level) {
      case 'stable':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'slow':
        return <Minus className="h-5 w-5 text-amber-500" />;
      case 'rapid':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getLevelLabel = () => {
    switch (degradationSummary.level) {
      case 'stable':
        return 'Stable';
      case 'slow':
        return 'Dégradation lente';
      case 'rapid':
        return 'Dégradation rapide';
    }
  };

  // Get future predictions
  const futurePredictions = predictions.filter(p => p.prediction_type === 'future');

  return (
    <div className="space-y-4">
      {/* Main degradation card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5" />
            Analyse de dégradation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score evolution */}
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: CONDITION_COLORS.good }}>
                {Math.round(degradationSummary.initialScore)}%
              </p>
              <p className="text-xs text-muted-foreground">Score initial</p>
            </div>
            
            <div className="flex-1 px-4">
              <div className="flex items-center justify-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: DEGRADATION_COLORS[degradationSummary.level],
                    color: DEGRADATION_COLORS[degradationSummary.level],
                  }}
                >
                  {degradationSummary.totalYears} ans
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-1">
                -{degradationSummary.annualDegradationRate.toFixed(1)}%/an
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ 
                color: CONDITION_COLORS[
                  degradationSummary.currentScore >= 80 ? 'good' :
                  degradationSummary.currentScore >= 60 ? 'fair' :
                  degradationSummary.currentScore >= 40 ? 'poor' : 'critical'
                ]
              }}>
                {Math.round(degradationSummary.currentScore)}%
              </p>
              <p className="text-xs text-muted-foreground">Score actuel</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>État du bien</span>
              <span>{Math.round(degradationSummary.currentScore)}%</span>
            </div>
            <Progress 
              value={degradationSummary.currentScore} 
              className="h-2"
            />
          </div>

          {/* Level indicator */}
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            degradationSummary.level === 'stable' && "bg-green-500/10",
            degradationSummary.level === 'slow' && "bg-amber-500/10",
            degradationSummary.level === 'rapid' && "bg-red-500/10",
          )}>
            {getLevelIcon()}
            <div>
              <p className="font-medium text-sm">{getLevelLabel()}</p>
              <p className="text-xs text-muted-foreground">
                Perte totale de {Math.round(degradationSummary.totalDegradation)} points
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent transitions */}
      {transitions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Transitions récentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transitions.slice(-3).map((transition, index) => (
              <motion.div
                key={transition.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{transition.from_year}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">{transition.to_year}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {transition.transition_type === 'renovation' && (
                    <Wrench className="h-4 w-4 text-blue-500" />
                  )}
                  {transition.degradation_rate && transition.degradation_rate > 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Future predictions */}
      {futurePredictions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Prévisions futures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {futurePredictions.slice(0, 3).map((prediction, index) => (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{prediction.prediction_year}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Confiance: {Math.round(prediction.confidence_level * 100)}%
                  </span>
                </div>
                {prediction.predicted_works_needed && prediction.predicted_works_needed.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {prediction.predicted_works_needed.length} travaux recommandés
                  </p>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
