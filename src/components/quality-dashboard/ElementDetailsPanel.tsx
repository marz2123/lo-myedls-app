import { motion } from 'framer-motion';
import { 
  LayoutGrid, Palette, Lightbulb, Droplets, Wind, 
  ThermometerSun, DoorOpen, X 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QualityMetric } from '@/hooks/useEdlQuality';

interface ElementDetailsPanelProps {
  selectedMetric: QualityMetric | null;
  onClose: () => void;
}

const elementTypes = [
  { name: 'Murs', icon: LayoutGrid },
  { name: 'Sols', icon: Palette },
  { name: 'Plafonds', icon: LayoutGrid },
  { name: 'Menuiseries', icon: DoorOpen },
  { name: 'Électricité', icon: Lightbulb },
  { name: 'Sanitaires', icon: Droplets },
  { name: 'Ventilation', icon: Wind },
  { name: 'Chauffage', icon: ThermometerSun },
];

export function ElementDetailsPanel({ selectedMetric, onClose }: ElementDetailsPanelProps) {
  if (!selectedMetric) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Détails par Élément</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Sélectionnez une pièce dans la heatmap</p>
            <p className="text-sm">pour voir les détails par élément</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          {selectedMetric.name}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className={`text-3xl font-bold ${getScoreColor(selectedMetric.score)}`}>
              {Math.round(selectedMetric.score)}
            </div>
            <div className="text-xs text-muted-foreground">Score global</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-3xl font-bold">
              {Math.round(selectedMetric.items_completed_percent)}%
            </div>
            <div className="text-xs text-muted-foreground">Complet</div>
          </div>
        </div>

        {/* Metrics Bars */}
        <div className="space-y-4 mb-6">
          <MetricBar 
            label="Photos valides" 
            value={selectedMetric.photos_valid_percent} 
          />
          <MetricBar 
            label="Descriptions correctes" 
            value={selectedMetric.descriptions_valid_percent} 
          />
          <MetricBar 
            label="Anomalies validées" 
            value={selectedMetric.anomalies_validated_percent} 
          />
          <MetricBar 
            label="Tâches correctes" 
            value={selectedMetric.tasks_correct_percent} 
          />
        </div>

        {/* Issues */}
        {selectedMetric.issues && selectedMetric.issues.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2 text-red-500">Problèmes détectés</h4>
            <div className="space-y-2">
              {selectedMetric.issues.map((issue: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10"
                >
                  <Badge variant="outline" className="text-red-500 border-red-500/30">
                    {issue.type}
                  </Badge>
                  <span className="text-sm text-red-400">{issue.message}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Element Types Preview */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-3">Éléments à vérifier</h4>
          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-2 gap-2">
              {elementTypes.map((element, index) => {
                const Icon = element.icon;
                // Simulate element scores based on room score
                const elementScore = Math.max(0, Math.min(100, 
                  selectedMetric.score + (Math.random() * 20 - 10)
                ));
                
                return (
                  <motion.div
                    key={element.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Icon className={`h-4 w-4 ${getScoreColor(elementScore)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{element.name}</p>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full rounded-full ${getProgressColor(elementScore)}`}
                          style={{ width: `${elementScore}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${getScoreColor(elementScore)}`}>
                      {Math.round(elementScore)}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const getColor = (val: number) => {
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
          className={`h-full rounded-full ${getColor(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
