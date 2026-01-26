import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskCard, KanbanTask } from './KanbanTaskCard';
import { KanbanFilters } from './KanbanFilters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutGrid, 
  List, 
  RefreshCw, 
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ColumnId = 'a-faire' | 'en-cours' | 'en-controle' | 'valide';

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onTaskUpdate?: (taskId: string, updates: Partial<KanbanTask>) => void;
  onTaskClick?: (task: KanbanTask) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const COLUMNS: { id: ColumnId; title: string; color: string; icon: React.ElementType }[] = [
  { id: 'a-faire', title: 'À faire', color: 'blue', icon: Clock },
  { id: 'en-cours', title: 'En cours', color: 'amber', icon: AlertCircle },
  { id: 'en-controle', title: 'En contrôle', color: 'purple', icon: Shield },
  { id: 'valide', title: 'Validé', color: 'green', icon: CheckCircle2 },
];

const statusToColumn: Record<string, ColumnId> = {
  'à faire': 'a-faire',
  'en cours': 'en-cours',
  'en contrôle': 'en-controle',
  'validé': 'valide',
  'validée': 'valide',
};

const columnToStatus: Record<ColumnId, string> = {
  'a-faire': 'à faire',
  'en-cours': 'en cours',
  'en-controle': 'en contrôle',
  'valide': 'validé',
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskUpdate,
  onTaskClick,
  onRefresh,
  loading = false,
}) => {
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [localTasks, setLocalTasks] = useState<KanbanTask[]>(tasks);
  
  // Filters
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  // Update local tasks when props change
  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Extract unique families and zones
  const families = useMemo(() => 
    [...new Set(localTasks.map(t => t.familyName))].sort(),
    [localTasks]
  );
  
  const zones = useMemo(() => 
    [...new Set(localTasks.map(t => t.pieceOrZone))].sort(),
    [localTasks]
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return localTasks.filter(task => {
      if (selectedFamily && task.familyName !== selectedFamily) return false;
      if (selectedZone && task.pieceOrZone !== selectedZone) return false;
      if (selectedPriority && task.priority !== selectedPriority) return false;
      return true;
    });
  }, [localTasks, selectedFamily, selectedZone, selectedPriority]);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<ColumnId, KanbanTask[]> = {
      'a-faire': [],
      'en-cours': [],
      'en-controle': [],
      'valide': [],
    };

    filteredTasks.forEach(task => {
      const columnId = statusToColumn[task.status.toLowerCase()] || 'a-faire';
      grouped[columnId].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = localTasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  }, [localTasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which column the task is being dragged over
    const overColumn = COLUMNS.find(col => col.id === overId);
    if (!overColumn) return;

    // Update the task's status
    setLocalTasks(prev => 
      prev.map(task => 
        task.id === activeId 
          ? { ...task, status: columnToStatus[overColumn.id] }
          : task
      )
    );
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetColumnId: ColumnId | null = null;
    
    // Check if dropped on a column
    const overColumn = COLUMNS.find(col => col.id === overId);
    if (overColumn) {
      targetColumnId = overColumn.id;
    } else {
      // Check if dropped on a task - find its column
      const overTask = localTasks.find(t => t.id === overId);
      if (overTask) {
        targetColumnId = statusToColumn[overTask.status.toLowerCase()] || 'a-faire';
      }
    }

    if (!targetColumnId) return;

    const newStatus = columnToStatus[targetColumnId];
    const task = localTasks.find(t => t.id === activeId);
    
    if (task && task.status !== newStatus) {
      // Update local state
      setLocalTasks(prev =>
        prev.map(t =>
          t.id === activeId ? { ...t, status: newStatus } : t
        )
      );

      // Notify parent
      onTaskUpdate?.(activeId, { status: newStatus });
      
      toast.success(`Tâche déplacée vers "${COLUMNS.find(c => c.id === targetColumnId)?.title}"`);
    }
  }, [localTasks, onTaskUpdate]);

  const clearAllFilters = useCallback(() => {
    setSelectedFamily(null);
    setSelectedZone(null);
    setSelectedPriority(null);
  }, []);

  // Stats
  const stats = useMemo(() => ({
    total: filteredTasks.length,
    aFaire: tasksByColumn['a-faire'].length,
    enCours: tasksByColumn['en-cours'].length,
    enControle: tasksByColumn['en-controle'].length,
    valide: tasksByColumn['valide'].length,
    urgentes: filteredTasks.filter(t => t.priority === 'urgente').length,
  }), [filteredTasks, tasksByColumn]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Kanban Tâches Chantier</h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} tâche(s) • {stats.urgentes > 0 && (
              <span className="text-red-500 font-medium">{stats.urgentes} urgente(s)</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const count = tasksByColumn[col.id].length;
          return (
            <Card key={col.id} className="p-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg',
                  col.color === 'blue' && 'bg-blue-500/10',
                  col.color === 'amber' && 'bg-amber-500/10',
                  col.color === 'purple' && 'bg-purple-500/10',
                  col.color === 'green' && 'bg-green-500/10',
                )}>
                  <Icon className={cn(
                    'h-4 w-4',
                    col.color === 'blue' && 'text-blue-500',
                    col.color === 'amber' && 'text-amber-500',
                    col.color === 'purple' && 'text-purple-500',
                    col.color === 'green' && 'text-green-500',
                  )} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{col.title}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <KanbanFilters
        families={families}
        zones={zones}
        selectedFamily={selectedFamily}
        selectedZone={selectedZone}
        selectedPriority={selectedPriority}
        onFamilyChange={setSelectedFamily}
        onZoneChange={setSelectedZone}
        onPriorityChange={setSelectedPriority}
        onClearAll={clearAllFilters}
      />

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto mt-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 min-w-max">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={tasksByColumn[column.id]}
                color={column.color}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-3 scale-105">
                <KanbanTaskCard task={activeTask} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};
