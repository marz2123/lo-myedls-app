import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Gauge, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import type { WearScore } from '@/types/predictive';

interface WearScorePanelProps {
  wearScores: WearScore[];
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  excellent: { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' },
  good: { label: 'Bon', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  fair: { label: 'Correct', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  poor: { label: 'Faible', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: 'Critique', color: 'text-red-600', bgColor: 'bg-red-100' }
};

const elementTypeLabels: Record<string, string> = {
  sol: 'Sol',
  mur: 'Murs',
  plafond: 'Plafond',
  menuiserie: 'Menuiseries',
  sanitaire: 'Sanitaires',
  electrique: 'Électricité',
  chauffage: 'Chauffage',
  ventilation: 'Ventilation',
  cuisine: 'Cuisine',
  mobilier: 'Mobilier'
};

export const WearScorePanel: React.FC<WearScorePanelProps> = ({
  wearScores,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Usure Estimée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by element type
  const groupedScores = wearScores.reduce((acc, score) => {
    if (!acc[score.element_type]) {
      acc[score.element_type] = [];
    }
    acc[score.element_type].push(score);
    return acc;
  }, {} as Record<string, WearScore[]>);

  // Calculate average per type
  const typeAverages = Object.entries(groupedScores).map(([type, scores]) => ({
    type,
    avgScore: Math.round(scores.reduce((sum, s) => sum + s.current_score, 0) / scores.length),
    count: scores.length,
    needsAttention: scores.filter(s => s.needs_attention).length,
    projected1Year: Math.round(scores.reduce((sum, s) => sum + (s.projected_score_1year || s.current_score), 0) / scores.length)
  })).sort((a, b) => a.avgScore - b.avgScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Usure Estimée par Élément
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {typeAverages.map(({ type, avgScore, count, needsAttention, projected1Year }) => {
              const status = avgScore >= 90 ? 'excellent' : avgScore >= 75 ? 'good' : avgScore >= 60 ? 'fair' : avgScore >= 40 ? 'poor' : 'critical';
              const config = statusConfig[status];
              const projectedChange = projected1Year - avgScore;

              return (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">
                        {elementTypeLabels[type] || type}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {count} élément{count > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge className={`${config.bgColor} ${config.color} border-0`}>
                      {config.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>État actuel</span>
                      <span className="font-medium">{avgScore}%</span>
                    </div>
                    <Progress value={avgScore} className="h-2" />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Projection 1 an:</span>
                    </div>
                    <span className={projectedChange < -10 ? 'text-red-500' : projectedChange < -5 ? 'text-amber-500' : 'text-muted-foreground'}>
                      {projected1Year}% ({projectedChange > 0 ? '+' : ''}{projectedChange}%)
                    </span>
                  </div>

                  {needsAttention > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-amber-600 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      {needsAttention} élément{needsAttention > 1 ? 's' : ''} nécessite{needsAttention > 1 ? 'nt' : ''} attention
                    </div>
                  )}
                </div>
              );
            })}

            {typeAverages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Gauge className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée d'usure disponible</p>
                <p className="text-sm">Lancez une analyse prédictive pour commencer</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
