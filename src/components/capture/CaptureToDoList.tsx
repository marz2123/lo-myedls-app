import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Circle, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight,
  Building2,
  Home,
  Warehouse,
  Trees,
} from 'lucide-react';

interface ToDoItem {
  id: string;
  name: string;
  type: 'piece' | 'zone_critique';
  category?: 'commune' | 'privative';
  priority?: 'normal' | 'critical';
  completed?: boolean;
}

interface CaptureToDoListProps {
  items: ToDoItem[];
  onItemClick?: (item: ToDoItem) => void;
  variant?: 'compact' | 'full';
  className?: string;
}

const CATEGORY_ICONS = {
  facade: Building2,
  toiture: Home,
  caves: Warehouse,
  jardin: Trees,
};

/**
 * CaptureToDoList - "À capturer" list showing remaining pieces/zones
 * 
 * Displays what's left to capture at a glance:
 * - Pieces not yet visited
 * - Critical zones not yet filmed (façade, toiture, caves...)
 */
export const CaptureToDoList = ({
  items,
  onItemClick,
  variant = 'full',
  className,
}: CaptureToDoListProps) => {
  const pendingItems = items.filter(item => !item.completed);
  const criticalItems = pendingItems.filter(item => item.priority === 'critical');
  const normalItems = pendingItems.filter(item => item.priority !== 'critical');
  
  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">À capturer</span>
          <Badge variant={pendingItems.length === 0 ? "default" : "secondary"}>
            {pendingItems.length} restant{pendingItems.length > 1 ? 's' : ''}
          </Badge>
        </div>
        
        {criticalItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {criticalItems.slice(0, 3).map(item => (
              <Badge 
                key={item.id} 
                variant="destructive" 
                className="gap-1 cursor-pointer hover:bg-destructive/80"
                onClick={() => onItemClick?.(item)}
              >
                <AlertTriangle className="h-3 w-3" />
                {item.name}
              </Badge>
            ))}
            {criticalItems.length > 3 && (
              <Badge variant="outline">+{criticalItems.length - 3}</Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Circle className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">À capturer</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {completedCount}/{items.length}
          </span>
          <Badge variant={pendingItems.length === 0 ? "default" : "outline"}>
            {progress}%
          </Badge>
        </div>
      </div>

      <ScrollArea className="max-h-[300px]">
        {/* Critical zones section */}
        {criticalItems.length > 0 && (
          <div className="p-3 border-b bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Zones critiques ({criticalItems.length})
              </span>
            </div>
            <div className="space-y-1">
              {criticalItems.map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-between h-auto py-2 px-3 hover:bg-destructive/10"
                  onClick={() => onItemClick?.(item)}
                >
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Normal pieces section */}
        {normalItems.length > 0 && (
          <div className="p-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
              Pièces restantes ({normalItems.length})
            </span>
            <div className="space-y-1">
              {normalItems.map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-between h-auto py-2 px-3"
                  onClick={() => onItemClick?.(item)}
                >
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.name}</span>
                    {item.category && (
                      <Badge variant="outline" className="text-xs">
                        {item.category === 'commune' ? '🏢' : '🏠'}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* All done state */}
        {pendingItems.length === 0 && (
          <div className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-green-600 dark:text-green-400">
              Tout est capturé ! ✔
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {items.length} éléments vérifiés
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
