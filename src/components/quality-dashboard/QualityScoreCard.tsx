import { motion } from 'framer-motion';
import { Star, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QualityScore } from '@/hooks/useEdlQuality';

interface QualityScoreCardProps {
  qualityScore: QualityScore | null;
  analyzing: boolean;
  onAnalyze: () => void;
}

export function QualityScoreCard({ qualityScore, analyzing, onAnalyze }: QualityScoreCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'excellent':
        return { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Excellent', emoji: '⭐' };
      case 'very_good':
        return { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Très bon', emoji: '🟦' };
      case 'average':
        return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Moyen', emoji: '🟨' };
      case 'needs_review':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'À revoir', emoji: '🔴' };
      default:
        return { icon: RefreshCw, color: 'text-muted-foreground', bg: 'bg-muted', label: 'En attente', emoji: '⏳' };
    }
  };

  const statusConfig = qualityScore ? getStatusConfig(qualityScore.status) : getStatusConfig('pending');
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Score Global EDL</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAnalyze}
            disabled={analyzing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyse...' : 'Analyser'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-6">
          {/* Score Circle */}
          <motion.div 
            className="relative w-40 h-40 mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={statusConfig.color}
                initial={{ strokeDasharray: '0 440' }}
                animate={{ 
                  strokeDasharray: `${(qualityScore?.overall_score || 0) * 4.4} 440`
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                className="text-4xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {qualityScore?.overall_score || 0}
              </motion.span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </motion.div>

          {/* Status Badge */}
          <motion.div 
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bg}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-lg">{statusConfig.emoji}</span>
            <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
            <span className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
          </motion.div>

          {/* Score Breakdown */}
          {qualityScore && (
            <div className="w-full mt-6 space-y-3">
              <ScoreBar label="Complétude" value={qualityScore.completeness_score} />
              <ScoreBar label="Cohérence IA" value={qualityScore.ai_coherence_score} />
              <ScoreBar label="Cohérence technique" value={qualityScore.technical_coherence_score} />
              <ScoreBar label="Qualité rédaction" value={qualityScore.writing_quality_score} />
              <ScoreBar label="Qualité photos" value={qualityScore.photo_quality_score} />
            </div>
          )}

          {qualityScore?.last_analyzed_at && (
            <p className="text-xs text-muted-foreground mt-4">
              Dernière analyse: {new Date(qualityScore.last_analyzed_at).toLocaleString('fr-FR')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const getBarColor = (val: number) => {
    if (val >= 80) return 'bg-green-500';
    if (val >= 60) return 'bg-blue-500';
    if (val >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div 
          className={`h-full rounded-full ${getBarColor(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
