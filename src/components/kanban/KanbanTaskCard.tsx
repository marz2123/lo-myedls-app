import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Wrench, 
  Zap, 
  Droplets, 
  PaintBucket, 
  Home, 
  Hammer,
  Settings,
  AlertTriangle,
  GripVertical,
  Calendar,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface KanbanTask {
  id: string;
  taskName: string;
  familyCode: string;
  familyName: string;
  category?: string;
  subCategory?: string | null;
  pieceOrZone: string;
  priority: 'basse' | 'normale' | 'haute' | 'urgente';
  status: string;
  description?: string;
  observations?: string;
  due_date?: string | null;
  assigned_to?: string | null;
  assigned_user?: { id: string; email: string; full_name?: string } | null;
}

interface KanbanTaskCardProps {
  task: KanbanTask;
  onClick?: () => void;
}

const getFamilyIcon = (familyCode: string) => {
  const code = familyCode.toLowerCase();
  if (code.includes('gros') || code.includes('structure')) return Hammer;
  if (code.includes('electri') || code.includes('technique')) return Zap;
  if (code.includes('plomb') || code.includes('eau')) return Droplets;
  if (code.includes('finition') || code.includes('peint')) return PaintBucket;
  if (code.includes('menuiser') || code.includes('second')) return Home;
  if (code.includes('vérifier')) return AlertTriangle;
  return Wrench;
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'urgente':
      return { 
        className: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
        label: 'Urgente'
      };
    case 'haute':
      return { 
        className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
        label: 'Haute'
      };
    case 'normale':
      return { 
        className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
        label: 'Normale'
      };
    case 'basse':
    default:
      return { 
        className: 'bg-muted text-muted-foreground border-border',
        label: 'Basse'
      };
  }
};

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const FamilyIcon = getFamilyIcon(task.familyCode);
  const priorityConfig = getPriorityConfig(task.priority);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing transition-all',
        'hover:shadow-md hover:border-primary/30',
        'bg-card border-border',
        isDragging && 'opacity-50 shadow-lg rotate-2 scale-105'
      )}
      onClick={onClick}
    >
      {/* Drag Handle + Priority */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div 
          {...attributes} 
          {...listeners}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-grab"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <Badge variant="outline" className={cn('text-xs font-medium', priorityConfig.className)}>
          {priorityConfig.label}
        </Badge>
      </div>

      {/* Task Name */}
      <h4 className="font-semibold text-sm text-foreground leading-tight mb-2">
        {task.taskName}
      </h4>

      {/* Family Info */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10">
          <FamilyIcon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground truncate">
          {task.familyCode} • {task.familyName}
        </span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1 mb-2">
        <Badge variant="secondary" className="text-xs font-normal">
          {task.pieceOrZone}
        </Badge>
      </div>

      {/* Category if present */}
      {task.category && (
        <p className="text-xs text-muted-foreground mb-2 truncate">
          {task.category}
          {task.subCategory && ` → ${task.subCategory}`}
        </p>
      )}

      {/* Due Date & Assignee */}
      {(task.due_date || task.assigned_to) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              new Date(task.due_date) < new Date() && "text-red-600 font-semibold",
              new Date(task.due_date) >= new Date() && new Date(task.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && "text-amber-600"
            )}>
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(task.due_date), 'dd/MM', { locale: fr })}</span>
            </div>
          )}
          {task.assigned_user && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[80px]">
                {task.assigned_user.full_name || task.assigned_user.email.split('@')[0]}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Observations */}
      {task.observations && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground italic line-clamp-2">
            {task.observations}
          </p>
        </div>
      )}
    </Card>
  );
};
