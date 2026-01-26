import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Droplets, 
  SquareSlash, 
  Paintbrush,
  CircleDot,
  Package,
  Wind,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { DetectedDifference, GeneratedTask, DIFFERENCE_TYPE_LABELS } from '@/hooks/useEDLComparison';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  fissure: <SquareSlash className="h-4 w-4" />,
  casse: <AlertTriangle className="h-4 w-4" />,
  salissure: <Droplets className="h-4 w-4" />,
  rayure: <Paintbrush className="h-4 w-4" />,
  decollement: <Layers className="h-4 w-4" />,
  moisissure: <Wind className="h-4 w-4" />,
  jaunissement: <CircleDot className="h-4 w-4" />,
  tache: <Droplets className="h-4 w-4" />,
  deformation: <Package className="h-4 w-4" />,
  manquant: <Package className="h-4 w-4" />
};

const SEVERITY_COLORS = {
  faible: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  moyen: 'bg-orange-100 text-orange-800 border-orange-300',
  fort: 'bg-red-100 text-red-800 border-red-300'
};

const SEVERITY_LABELS = {
  faible: 'Faible',
  moyen: 'Moyen',
  fort: 'Fort'
};

interface DifferenceCardProps {
  difference: DetectedDifference;
  tasks: GeneratedTask[];
  onApprove: (approved: boolean) => void;
  onToggleTask: (taskId: string, selected: boolean) => void;
  onViewComparison: () => void;
}

export function DifferenceCard({
  difference,
  tasks,
  onApprove,
  onToggleTask,
  onViewComparison
}: DifferenceCardProps) {
  const relatedTasks = tasks.filter(t => t.differenceId === difference.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-2xl border-2 transition-all",
        difference.approved 
          ? "bg-green-50/50 border-green-300" 
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            difference.severity === 'fort' ? 'bg-red-100' : 
            difference.severity === 'moyen' ? 'bg-orange-100' : 'bg-yellow-100'
          )}>
            {TYPE_ICONS[difference.type] || <AlertTriangle className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="font-semibold text-sm">
              {DIFFERENCE_TYPE_LABELS[difference.type] || 'Dégradation'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {difference.roomName} — {difference.elementType}
            </p>
          </div>
        </div>
        <Badge className={cn("text-xs", SEVERITY_COLORS[difference.severity])}>
          {SEVERITY_LABELS[difference.severity]}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3">
        {difference.description}
      </p>

      {/* Confidence */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${difference.confidence * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.round(difference.confidence * 100)}% confiance
        </span>
      </div>

      {/* Photo Preview */}
      <button
        onClick={onViewComparison}
        className="w-full mb-3 rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors"
      >
        <div className="flex h-20">
          <div className="relative w-1/2 border-r border-border">
            <img 
              src={difference.entryPhotoUrl} 
              alt="Entrée"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-green-500/90 text-white text-[10px] rounded">
              Entrée
            </span>
          </div>
          <div className="relative w-1/2">
            <img 
              src={difference.exitPhotoUrl} 
              alt="Sortie"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-orange-500/90 text-white text-[10px] rounded">
              Sortie
            </span>
          </div>
        </div>
      </button>

      {/* Suggested Tasks */}
      {relatedTasks.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground">Tâches suggérées:</p>
          {relatedTasks.map(task => (
            <label
              key={task.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            >
              <Checkbox
                checked={task.selected}
                onCheckedChange={(checked) => onToggleTask(task.id, checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{task.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {task.familyCode} / {task.categoryCode}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {difference.approved ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 border-green-300 text-green-700"
            onClick={() => onApprove(false)}
          >
            <Check className="h-4 w-4" />
            Approuvé
          </Button>
        ) : (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => onApprove(true)}
            >
              <Check className="h-4 w-4" />
              Approuver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onApprove(false)}
            >
              <X className="h-4 w-4" />
              Ignorer
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
