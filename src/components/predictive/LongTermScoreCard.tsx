import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LongTermScore } from '@/types/predictive';

interface LongTermScoreCardProps {
  score: LongTermScore | null;
  isLoading?: boolean;
}

const interpretationConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  excellent: { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-500' },
  very_good: { label: 'Très Bon', color: 'text-blue-600', bgColor: 'bg-blue-500' },
  good: { label: 'Correct', color: 'text-amber-600', bgColor: 'bg-amber-500' },
  fair: { label: 'Faible', color: 'text-orange-600', bgColor: 'bg-orange-500' },
  at_risk: { label: 'À Risque', color: 'text-red-600', bgColor: 'bg-red-500' }
};

const scoreBreakdown = [
  { key: 'current_state_score', label: 'État actuel', weight: '40%' },
  { key: 'repeated_anomalies_score', label: 'Anomalies répétées', weight: '20%' },
  { key: 'future_risks_score', label: 'Risques futurs', weight: '20%' },
  { key: 'wear_score', label: 'Usure', weight: '10%' },
  { key: 'maintenance_score', label: 'Maintenance', weight: '10%' }
];

export const LongTermScoreCard: React.FC<LongTermScoreCardProps> = ({
  score,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Score Long Terme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Score Long Terme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Score non disponible</p>
            <p className="text-sm">Lancez une analyse prédictive</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = interpretationConfig[score.interpretation] || interpretationConfig.good;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Score Long Terme du Bien
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Main Score */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full ${config.bgColor} flex items-center justify-center`}>
              <div className="w-28 h-28 rounded-full bg-background flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{score.overall_score}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            
            {/* Trend indicator */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 bg-background border rounded-full p-1">
              {score.trend === 'improving' ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : score.trend === 'declining' ? (
                <TrendingDown className="h-5 w-5 text-red-500" />
              ) : (
                <Minus className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <Badge className={`${config.bgColor} text-white border-0`}>
            {config.label}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {score.trend === 'improving' ? 'En amélioration' : 
             score.trend === 'declining' ? 'En déclin' : 'Stable'}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Détail du score</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Score pondéré selon l'importance de chaque facteur</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {scoreBreakdown.map(({ key, label, weight }) => {
            const value = score[key as keyof LongTermScore] as number;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{label} ({weight})</span>
                  <span className="font-medium">{value}%</span>
                </div>
                <Progress value={value} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
