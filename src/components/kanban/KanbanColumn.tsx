import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanTaskCard, KanbanTask } from './KanbanTaskCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: KanbanTask[];
  color: string;
  onTaskClick?: (task: KanbanTask) => void;
}

const getColumnStyle = (color: string) => {
  switch (color) {
    case 'blue':
      return 'border-t-blue-500 bg-blue-500/5';
    case 'amber':
      return 'border-t-amber-500 bg-amber-500/5';
    case 'purple':
      return 'border-t-purple-500 bg-purple-500/5';
    case 'green':
      return 'border-t-green-500 bg-green-500/5';
    default:
      return 'border-t-primary bg-primary/5';
  }
};

const getBadgeStyle = (color: string) => {
  switch (color) {
    case 'blue':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    case 'amber':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
    case 'purple':
      return 'bg-purple-500/20 text-purple-700 dark:text-purple-400';
    case 'green':
      return 'bg-green-500/20 text-green-700 dark:text-green-400';
    default:
      return 'bg-primary/20 text-primary';
  }
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  color,
  onTaskClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] rounded-lg border border-border border-t-4 transition-all',
        getColumnStyle(color),
        isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <Badge variant="secondary" className={cn('text-xs font-bold', getBadgeStyle(color))}>
          {tasks.length}
        </Badge>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[200px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm italic">
              Aucune tâche
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanTaskCard 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick?.(task)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};
