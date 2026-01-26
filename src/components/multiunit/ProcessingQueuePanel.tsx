import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap
} from 'lucide-react';
import type { ProcessingQueueItem } from '@/types/multiunit';
import { cn } from '@/lib/utils';

interface ProcessingQueuePanelProps {
  items: ProcessingQueueItem[];
  totalProgress: number;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  processing: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
};

export function ProcessingQueuePanel({ items, totalProgress }: ProcessingQueuePanelProps) {
  const processingCount = items.filter(i => i.status === 'processing').length;
  const completedCount = items.filter(i => i.status === 'completed').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">File de traitement IA</CardTitle>
          </div>
          <Badge variant="secondary">
            {completedCount}/{items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global Progress */}
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Progression globale</span>
            <span className="text-muted-foreground">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-blue-600">{processingCount}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Terminés</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-red-600">{failedCount}</p>
            <p className="text-xs text-muted-foreground">Erreurs</p>
          </div>
        </div>

        {/* Queue Items */}
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {items.map(item => {
              const config = STATUS_CONFIG[item.status];
              const Icon = config.icon;
              
              return (
                <div 
                  key={item.id}
                  className={cn(
                    "p-2 rounded-lg border flex items-center gap-3",
                    item.status === 'processing' && "border-blue-200 dark:border-blue-800"
                  )}
                >
                  <div className={cn("p-1.5 rounded", config.bg)}>
                    <Icon className={cn(
                      "h-4 w-4",
                      config.color,
                      item.status === 'processing' && "animate-spin"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.task_type}</p>
                    {item.status === 'processing' && (
                      <Progress value={item.progress_percent} className="h-1 mt-1" />
                    )}
                    {item.status === 'failed' && item.error_message && (
                      <p className="text-xs text-red-500 truncate">{item.error_message}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.status === 'processing' && `${item.progress_percent}%`}
                    {item.status === 'completed' && '✓'}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
