import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, Circle, AlertTriangle, Camera, ChevronRight,
  Zap, Flame, Wind, Droplets, DoorOpen, ShieldCheck, Archive,
  SquareSlash, Grid3x3, Square, Sparkles, Plus
} from 'lucide-react';
import type { ChecklistItem as ChecklistItemType } from '@/hooks/useRoomChecklist';

interface ChecklistItemProps {
  item: ChecklistItemType;
  isExpanded: boolean;
  onTap: () => void;
  onToggleExpand: () => void;
  onStatusChange: (status: 'bon' | 'moyen' | 'mauvais') => void;
  onDescriptionChange: (description: string) => void;
  onTakePhoto: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  SquareSlash,
  Grid3x3,
  Square,
  DoorOpen,
  Zap,
  Flame,
  Wind,
  Droplets,
  ShieldCheck,
  Archive,
  Circle,
};

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  isExpanded,
  onTap,
  onToggleExpand,
  onStatusChange,
  onDescriptionChange,
  onTakePhoto,
}) => {
  const Icon = ICON_MAP[item.icon] || Circle;

  const statusConfig = {
    pending: {
      bg: 'bg-muted/50',
      border: 'border-muted',
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      label: 'À faire',
      labelClass: 'bg-muted text-muted-foreground',
    },
    bon: {
      bg: 'bg-green-500/5',
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-500',
      label: 'Bon',
      labelClass: 'bg-green-500/20 text-green-600',
    },
    moyen: {
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-500',
      label: 'Moyen',
      labelClass: 'bg-amber-500/20 text-amber-600',
    },
    mauvais: {
      bg: 'bg-red-500/5',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-500',
      label: 'Mauvais',
      labelClass: 'bg-red-500/20 text-red-600',
    },
  };

  const config = statusConfig[item.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border transition-all duration-300',
        config.border,
        config.bg,
        isExpanded && 'shadow-lg'
      )}
    >
      {/* Main row */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Status icon */}
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
          config.iconBg
        )}>
          {item.status === 'pending' ? (
            <Icon className={cn('h-5 w-5', config.iconColor)} />
          ) : item.hasAnomaly ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : (
            <CheckCircle2 className={cn('h-5 w-5', config.iconColor)} />
          )}
        </div>

        {/* Name and badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{item.name}</span>
            {item.autoValidated && (
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={cn('text-[10px] h-5', config.labelClass)}>
              {config.label}
            </Badge>
            {item.anomalyCount > 0 && (
              <Badge className="text-[10px] h-5 bg-red-500/20 text-red-600">
                {item.anomalyCount} anomalie{item.anomalyCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Photo thumbnail or take photo button */}
        <div className="flex items-center gap-2 shrink-0">
          {item.photoUrl ? (
            <div className="relative">
              <img 
                src={item.photoUrl} 
                alt={item.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
              {item.photoCount > 1 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
                  {item.photoCount}
                </span>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 rounded-lg bg-primary/10 hover:bg-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                onTakePhoto();
              }}
            >
              <Camera className="h-4 w-4 text-primary" />
            </Button>
          )}
          <ChevronRight className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90'
          )} />
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
              {/* Status buttons */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">État</p>
                <div className="flex gap-2">
                  {(['bon', 'moyen', 'mauvais'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={item.status === status ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'flex-1 capitalize',
                        item.status === status && status === 'bon' && 'bg-green-500 hover:bg-green-600',
                        item.status === status && status === 'moyen' && 'bg-amber-500 hover:bg-amber-600',
                        item.status === status && status === 'mauvais' && 'bg-red-500 hover:bg-red-600'
                      )}
                      onClick={() => onStatusChange(status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Description</p>
                <Textarea
                  value={item.description || ''}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Ajouter une description..."
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>

              {/* Anomalies list */}
              {item.anomalies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Anomalies détectées</p>
                  <div className="space-y-2">
                    {item.anomalies.map((anomaly) => (
                      <div 
                        key={anomaly.id}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-xs font-medium text-red-600 capitalize">
                            {anomaly.type}
                          </span>
                          <Badge className="text-[10px] h-4 bg-red-500/20 text-red-600 ml-auto">
                            {Math.round(anomaly.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{anomaly.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated tasks */}
              {item.tasks.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tâches suggérées</p>
                  <div className="space-y-2">
                    {item.tasks.map((task) => (
                      <div 
                        key={task.id}
                        className="p-2 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <p className="text-xs font-medium text-foreground">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add more photos button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onTakePhoto}
              >
                <Plus className="h-4 w-4 mr-2" />
                {item.photoCount > 0 ? 'Ajouter d\'autres photos' : 'Prendre la photo obligatoire'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
