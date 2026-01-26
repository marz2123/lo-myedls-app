import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZoneStatus {
  id: string;
  name: string;
  completed: boolean;
}

interface LieuProgress {
  id: string;
  name: string;
  zones: ZoneStatus[];
}

interface ReportageProgressProps {
  lieux: LieuProgress[];
  currentLieuId?: string;
  className?: string;
  variant?: 'compact' | 'detailed';
}

export const ReportageProgress = ({
  lieux,
  currentLieuId,
  className,
  variant = 'compact',
}: ReportageProgressProps) => {
  const stats = useMemo(() => {
    let totalZones = 0;
    let completedZones = 0;
    let totalLieux = lieux.length;
    let completedLieux = 0;

    lieux.forEach(lieu => {
      const lieuCompleted = lieu.zones.length > 0 && lieu.zones.every(z => z.completed);
      if (lieuCompleted) completedLieux++;
      
      lieu.zones.forEach(zone => {
        totalZones++;
        if (zone.completed) completedZones++;
      });
    });

    const progressPercent = totalZones > 0 ? (completedZones / totalZones) * 100 : 0;

    return {
      totalZones,
      completedZones,
      totalLieux,
      completedLieux,
      progressPercent,
    };
  }, [lieux]);

  const estimatedTimeRemaining = useMemo(() => {
    const remainingZones = stats.totalZones - stats.completedZones;
    // Estimate ~6 seconds per zone for 20 zones in 2 minutes
    const seconds = remainingZones * 6;
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}min`;
  }, [stats]);

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Progression</span>
            <Badge variant="outline" className="text-xs">
              {stats.completedZones}/{stats.totalZones} zones
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">~{estimatedTimeRemaining}</span>
          </div>
        </div>
        <Progress value={stats.progressPercent} className="h-2" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {Math.round(stats.progressPercent)}%
              </span>
            </div>
          </div>
          <div>
            <p className="font-semibold">
              {stats.completedZones} / {stats.totalZones} zones
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.completedLieux} / {stats.totalLieux} lieux terminés
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          ~{estimatedTimeRemaining}
        </Badge>
      </div>

      {/* Progress bar */}
      <Progress value={stats.progressPercent} className="h-3" />

      {/* Lieux breakdown */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {lieux.map(lieu => {
          const lieuCompleted = lieu.zones.length > 0 && lieu.zones.every(z => z.completed);
          const lieuProgress = lieu.zones.length > 0 
            ? (lieu.zones.filter(z => z.completed).length / lieu.zones.length) * 100 
            : 0;
          const isCurrent = lieu.id === currentLieuId;

          return (
            <div 
              key={lieu.id}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg transition-colors',
                isCurrent && 'bg-primary/10 border border-primary/20',
                lieuCompleted && 'opacity-60'
              )}
            >
              {lieuCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                )} />
              )}
              <span className={cn(
                'text-sm flex-1 truncate',
                lieuCompleted && 'line-through',
                isCurrent && 'font-medium'
              )}>
                {lieu.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {lieu.zones.filter(z => z.completed).length}/{lieu.zones.length}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
