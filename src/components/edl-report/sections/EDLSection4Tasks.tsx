import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Wrench, Zap, PaintBucket, HelpCircle, Home as HomeIcon, Building, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  familyCode: string;
  familyName: string;
  category: string;
  subCategory: string | null;
  taskName: string;
  description: string;
  pieceOrZone: string;
  priority: 'basse' | 'normale' | 'haute' | 'urgente';
  status: string;
  observations?: string;
}

interface EDLSection4TasksProps {
  tasks: Task[];
}

const priorityConfig = {
  urgente: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    icon: AlertCircle,
    label: 'Urgente'
  },
  haute: {
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800',
    icon: Clock,
    label: 'Haute'
  },
  normale: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    icon: CheckCircle,
    label: 'Normale'
  },
  basse: {
    color: 'bg-muted text-muted-foreground border-border',
    icon: CheckCircle,
    label: 'Basse'
  }
};

const familyIcons: Record<string, { icon: React.ComponentType<any>; emoji: string }> = {
  'F-GrosOeuvre': { icon: Building, emoji: '🧱' },
  'F-SecondOeuvre': { icon: HomeIcon, emoji: '🚪' },
  'F-Techniques': { icon: Zap, emoji: '⚡' },
  'F-Finitions': { icon: PaintBucket, emoji: '🎨' },
  'F-ÀVérifier': { icon: HelpCircle, emoji: '❓' },
};

const getFamilyIcon = (familyCode: string) => {
  return familyIcons[familyCode] || familyIcons['F-ÀVérifier'];
};

export const EDLSection4Tasks: React.FC<EDLSection4TasksProps> = ({ tasks }) => {
  // Group tasks by pieceOrZone, then by familyCode
  const groupedTasks = useMemo(() => {
    const byPiece: Record<string, Record<string, Task[]>> = {};
    
    // Sort tasks first
    const sortedTasks = [...tasks].sort((a, b) => {
      // Sort by piece first
      if (a.pieceOrZone !== b.pieceOrZone) {
        return a.pieceOrZone.localeCompare(b.pieceOrZone);
      }
      // Then by family
      if (a.familyCode !== b.familyCode) {
        return a.familyCode.localeCompare(b.familyCode);
      }
      // Then by priority
      const priorityOrder = { urgente: 0, haute: 1, normale: 2, basse: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });

    sortedTasks.forEach(task => {
      const piece = task.pieceOrZone || 'Non localisé';
      const family = task.familyCode;
      
      if (!byPiece[piece]) {
        byPiece[piece] = {};
      }
      if (!byPiece[piece][family]) {
        byPiece[piece][family] = [];
      }
      byPiece[piece][family].push(task);
    });

    return byPiece;
  }, [tasks]);

  const pieceNames = Object.keys(groupedTasks);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <ListChecks className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Tâches associées</h2>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tâche(s) groupée(s) par pièce et famille
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="px-3 py-1">
          Total: {tasks.length}
        </Badge>
        <Badge className={priorityConfig.urgente.color}>
          Urgentes: {tasks.filter(t => t.priority === 'urgente').length}
        </Badge>
        <Badge className={priorityConfig.haute.color}>
          Hautes: {tasks.filter(t => t.priority === 'haute').length}
        </Badge>
        <Badge className={priorityConfig.normale.color}>
          Normales: {tasks.filter(t => t.priority === 'normale').length}
        </Badge>
      </div>

      {/* Tasks by Piece */}
      {tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <ListChecks className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune tâche extraite pour ce projet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {pieceNames.map((pieceName) => (
            <div key={pieceName} className="space-y-4">
              {/* Piece Header */}
              <div className="flex items-center gap-2 pb-2 border-b-2 border-primary/20">
                <HomeIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">{pieceName}</h3>
                <Badge variant="secondary" className="ml-2">
                  {Object.values(groupedTasks[pieceName]).flat().length} tâche(s)
                </Badge>
              </div>

              {/* Families within Piece */}
              {Object.entries(groupedTasks[pieceName]).map(([familyCode, familyTasks]) => {
                const familyInfo = getFamilyIcon(familyCode);
                const familyName = familyTasks[0]?.familyName || familyCode;

                return (
                  <div key={familyCode} className="ml-4 space-y-3">
                    {/* Family Sub-header */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-lg">{familyInfo.emoji}</span>
                      <span className="font-medium">{familyName}</span>
                      <span className="text-xs">({familyCode})</span>
                    </div>

                    {/* Task Cards */}
                    <div className="grid gap-3">
                      {familyTasks.map((task) => {
                        const priority = priorityConfig[task.priority] || priorityConfig.normale;
                        const PriorityIcon = priority.icon;

                        return (
                          <Card 
                            key={task.id}
                            className="p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Task Name */}
                                <h4 className="font-semibold text-base mb-1 truncate">
                                  {task.taskName}
                                </h4>
                                
                                {/* Description */}
                                {task.description && (
                                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}

                                {/* Meta Info */}
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="text-muted-foreground">
                                    {task.familyCode} • {task.familyName}
                                  </span>
                                  {task.category && (
                                    <span className="text-muted-foreground">
                                      / {task.category}
                                    </span>
                                  )}
                                  {task.subCategory && (
                                    <span className="text-muted-foreground">
                                      / {task.subCategory}
                                    </span>
                                  )}
                                </div>

                                {/* Observations */}
                                {task.observations && (
                                  <p className="mt-2 text-xs italic text-muted-foreground bg-muted p-2 rounded">
                                    📝 {task.observations}
                                  </p>
                                )}
                              </div>

                              {/* Right Side - Priority & Status */}
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <Badge className={cn("text-xs", priority.color)}>
                                  <PriorityIcon className="w-3 h-3 mr-1" />
                                  {priority.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {task.status}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
