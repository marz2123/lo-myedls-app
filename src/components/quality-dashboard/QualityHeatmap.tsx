import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QualityMetric } from '@/hooks/useEdlQuality';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QualityHeatmapProps {
  metrics: QualityMetric[];
  onSelectMetric: (metric: QualityMetric) => void;
}

export function QualityHeatmap({ metrics, onSelectMetric }: QualityHeatmapProps) {
  const roomMetrics = metrics.filter(m => m.metric_type === 'room');

  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-green-500', text: 'text-white', label: 'Impeccable' };
    if (score >= 75) return { bg: 'bg-blue-500', text: 'text-white', label: 'Bon' };
    if (score >= 60) return { bg: 'bg-amber-400', text: 'text-black', label: 'Moyen' };
    if (score >= 40) return { bg: 'bg-orange-500', text: 'text-white', label: 'Lacunes' };
    return { bg: 'bg-red-500', text: 'text-white', label: 'Critique' };
  };

  const defaultRooms = [
    'Entrée', 'Salon', 'Cuisine', 'Chambre 1', 'Chambre 2', 
    'Salle de bain', 'WC', 'Balcon', 'Cave'
  ];

  const displayRooms = roomMetrics.length > 0 
    ? roomMetrics 
    : defaultRooms.map(name => ({
        id: name,
        quality_score_id: '',
        metric_type: 'room' as const,
        name,
        score: 0,
        photos_valid_percent: 0,
        descriptions_valid_percent: 0,
        anomalies_validated_percent: 0,
        tasks_correct_percent: 0,
        items_completed_percent: 0,
        issues: []
      }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Heatmap Qualité</span>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              ≥90 Impeccable
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              ≥75 Bon
            </Badge>
            <Badge variant="outline" className="bg-amber-400/10 text-amber-600 border-amber-400/20">
              ≥60 Moyen
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
              &lt;60 Critique
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <TooltipProvider>
            {displayRooms.map((metric, index) => {
              const colorConfig = getScoreColor(metric.score);
              return (
                <Tooltip key={metric.id || metric.name}>
                  <TooltipTrigger asChild>
                    <motion.button
                      className={`relative p-4 rounded-xl ${colorConfig.bg} ${colorConfig.text} transition-all hover:scale-105 hover:shadow-lg`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => 'id' in metric && onSelectMetric(metric as QualityMetric)}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold">{Math.round(metric.score)}</div>
                        <div className="text-xs opacity-80 truncate">{metric.name}</div>
                      </div>
                      {metric.issues && metric.issues.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                          {metric.issues.length}
                        </div>
                      )}
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold">{metric.name}</p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Photos valides:</span>
                          <span>{Math.round(metric.photos_valid_percent)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Descriptions:</span>
                          <span>{Math.round(metric.descriptions_valid_percent)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Anomalies validées:</span>
                          <span>{Math.round(metric.anomalies_validated_percent)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tâches correctes:</span>
                          <span>{Math.round(metric.tasks_correct_percent)}%</span>
                        </div>
                      </div>
                      {metric.issues && metric.issues.length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs font-medium text-red-400">Problèmes détectés:</p>
                          {metric.issues.map((issue: any, i: number) => (
                            <p key={i} className="text-xs text-red-300">• {issue.message}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
