import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ConsistencyScoreCardProps {
  score: number;
  summary?: string;
  photoDescriptionScore?: number;
  stateAnomalyScore?: number;
  writingQualityScore?: number;
  photoCoverageScore?: number;
  totalInconsistencies: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  isAnalyzing?: boolean;
}

export const ConsistencyScoreCard = ({
  score,
  summary,
  photoDescriptionScore = 0,
  stateAnomalyScore = 0,
  writingQualityScore = 0,
  photoCoverageScore = 0,
  totalInconsistencies,
  criticalCount,
  warningCount,
  infoCount,
  isAnalyzing,
}: ConsistencyScoreCardProps) => {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'from-green-500 to-emerald-600';
    if (s >= 80) return 'from-blue-500 to-indigo-600';
    if (s >= 60) return 'from-orange-500 to-amber-600';
    return 'from-red-500 to-rose-600';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 90) return 'Excellent';
    if (s >= 80) return 'Bon';
    if (s >= 60) return 'À améliorer';
    return 'Critique';
  };

  const subScores = [
    { label: 'Photo ↔ Description', score: photoDescriptionScore, icon: '📸' },
    { label: 'État ↔ Anomalies', score: stateAnomalyScore, icon: '⚡' },
    { label: 'Qualité rédaction', score: writingQualityScore, icon: '✍️' },
    { label: 'Couverture photo', score: photoCoverageScore, icon: '🎯' },
  ];

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Score de Cohérence IA
          {isAnalyzing && (
            <Badge variant="secondary" className="ml-auto animate-pulse">
              <Sparkles className="mr-1 h-3 w-3" />
              Analyse en cours...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Main Score */}
        <div className="flex items-center justify-center mb-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center",
              "bg-gradient-to-br shadow-lg",
              getScoreColor(score)
            )}
          >
            <div className="absolute inset-2 bg-background rounded-full flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{score}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </motion.div>
        </div>

        {/* Score Label */}
        <div className="text-center mb-4">
          <Badge 
            className={cn(
              "text-sm px-4 py-1",
              score >= 90 && "bg-green-500",
              score >= 80 && score < 90 && "bg-blue-500",
              score >= 60 && score < 80 && "bg-orange-500",
              score < 60 && "bg-red-500"
            )}
          >
            {getScoreLabel(score)}
          </Badge>
          {summary && (
            <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
          )}
        </div>

        {/* Inconsistency Counts */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Critiques</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{warningCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Alertes</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{infoCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Infos</span>
          </div>
        </div>

        {/* Sub Scores */}
        <div className="space-y-3">
          {subScores.map((sub, index) => (
            <motion.div
              key={sub.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{sub.icon}</span>
                  {sub.label}
                </span>
                <span className={cn(
                  "font-medium",
                  sub.score >= 80 ? "text-green-600" : sub.score >= 60 ? "text-orange-600" : "text-red-600"
                )}>
                  {sub.score}%
                </span>
              </div>
              <Progress 
                value={sub.score} 
                className={cn(
                  "h-2",
                  sub.score >= 80 && "[&>div]:bg-green-500",
                  sub.score >= 60 && sub.score < 80 && "[&>div]:bg-orange-500",
                  sub.score < 60 && "[&>div]:bg-red-500"
                )}
              />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
