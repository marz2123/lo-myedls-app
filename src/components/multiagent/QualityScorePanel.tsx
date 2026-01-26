import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Award, TrendingUp, TrendingDown, Minus, 
  CheckCircle2, AlertTriangle, XCircle, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QualityAnalysisResult, CoherenceAnalysisResult } from '@/types/multiagent';

interface QualityScorePanelProps {
  qualityResult?: QualityAnalysisResult;
  coherenceResult?: CoherenceAnalysisResult;
}

export const QualityScorePanel: React.FC<QualityScorePanelProps> = ({
  qualityResult,
  coherenceResult
}) => {
  if (!qualityResult) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Analyse qualité non disponible</h3>
          <p className="text-muted-foreground text-sm">
            Lancez une analyse pour voir les scores de qualité.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <Minus className="h-4 w-4 text-amber-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/30';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className={cn("border-2", getScoreBg(qualityResult.scores.overall))}>
        <CardContent className="py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className={cn("h-8 w-8", getScoreColor(qualityResult.scores.overall))} />
              <span className={cn("text-5xl font-bold", getScoreColor(qualityResult.scores.overall))}>
                {Math.round(qualityResult.scores.overall)}
              </span>
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="text-muted-foreground">Score Qualité Global</p>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Détail des scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(qualityResult.scores)
            .filter(([key]) => key !== 'overall')
            .map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex items-center gap-2">
                    {getScoreIcon(value as number)}
                    <span className={cn("font-medium", getScoreColor(value as number))}>
                      {Math.round(value as number)}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={value as number} 
                  className={cn(
                    "h-2",
                    (value as number) >= 80 && "[&>div]:bg-green-500",
                    (value as number) >= 60 && (value as number) < 80 && "[&>div]:bg-amber-500",
                    (value as number) < 60 && "[&>div]:bg-red-500"
                  )}
                />
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Coherence Score */}
      {coherenceResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Score de cohérence
              <Badge variant={coherenceResult.score >= 80 ? 'default' : 'secondary'}>
                {Math.round(coherenceResult.score)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{coherenceResult.photoDescriptionMatch}%</p>
                <p className="text-xs text-muted-foreground">Photo ↔ Desc</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{coherenceResult.anomalyTaskMatch}%</p>
                <p className="text-xs text-muted-foreground">Anomalie ↔ Tâche</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{coherenceResult.stateAnomalyMatch}%</p>
                <p className="text-xs text-muted-foreground">État ↔ Anomalie</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {qualityResult.recommendations && qualityResult.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {qualityResult.recommendations.map((rec, i) => (
              <div 
                key={i}
                className={cn(
                  "p-3 rounded-lg border text-sm",
                  rec.priority === 'high' && "bg-red-500/5 border-red-500/30",
                  rec.priority === 'medium' && "bg-amber-500/5 border-amber-500/30",
                  rec.priority === 'low' && "bg-blue-500/5 border-blue-500/30"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {rec.priority}
                  </Badge>
                  <span className="font-medium">{rec.category}</span>
                </div>
                <p className="text-muted-foreground">{rec.description}</p>
                {rec.action && (
                  <p className="text-primary text-xs mt-1">→ {rec.action}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Systematic Errors */}
      {qualityResult.systematicErrors && qualityResult.systematicErrors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Erreurs systématiques détectées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {qualityResult.systematicErrors.map((err, i) => (
              <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/30 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{err.pattern}</span>
                  <Badge variant="destructive" className="text-xs">
                    {err.occurrences}x
                  </Badge>
                </div>
                <p className="text-muted-foreground">{err.suggestion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
