import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KanbanBoard } from "@/components/kanban";
import { useKanbanTasks } from "@/hooks/useKanbanTasks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Calendar as CalendarIcon, 
  Loader2,
  CheckSquare,
  AlertTriangle,
  Clock,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SequenceTaskExtractor } from "./SequenceTaskExtractor";

interface BureauTasksProps {
  projectId: string;
}

interface TaskForAssignment {
  id: string;
  title: string;
  priority?: string;
  assigned_to_name?: string;
  due_date?: string;
}

const WORKER_ROLES = [
  { value: 'plombier', label: 'Plombier' },
  { value: 'peintre', label: 'Peintre' },
  { value: 'plaquiste', label: 'Plaquiste' },
  { value: 'electricien', label: 'Électricien' },
  { value: 'carreleur', label: 'Carreleur' },
  { value: 'menuisier', label: 'Menuisier' },
  { value: 'macon', label: 'Maçon' },
  { value: 'chef_chantier', label: 'Chef de chantier' },
  { value: 'economiste', label: 'Économiste' },
  { value: 'architecte', label: 'Architecte' },
];

export function BureauTasks({ projectId }: BureauTasksProps) {
  const { toast } = useToast();
  const { tasks, loading, refresh, updateTaskStatus } = useKanbanTasks({ projectId });
  
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [bulkAssignName, setBulkAssignName] = useState("");
  const [bulkAssignRole, setBulkAssignRole] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState<Date | undefined>();
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleTaskClick = (task: any) => {
    // Toggle selection
    setSelectedTasks(prev => 
      prev.includes(task.id) 
        ? prev.filter(id => id !== task.id)
        : [...prev, task.id]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedTasks.length === 0) return;
    
    setIsSaving(true);
    try {
      const updates: any = {};
      
      if (bulkAssignName) updates.assigned_to_name = bulkAssignName;
      if (bulkAssignRole) updates.assigned_to_role = bulkAssignRole;
      if (bulkDueDate) updates.due_date = format(bulkDueDate, 'yyyy-MM-dd');
      if (bulkPriority) updates.priority = bulkPriority;
      if (bulkStatus) updates.status = bulkStatus;

      // Update problem_tasks
      const { error } = await supabase
        .from('problem_tasks')
        .update(updates)
        .in('id', selectedTasks);

      if (error) throw error;

      toast({
        title: "Mise à jour réussie",
        description: `${selectedTasks.length} tâche(s) modifiée(s)`,
      });

      setSelectedTasks([]);
      setAssignDialogOpen(false);
      resetBulkForm();
      refresh();
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les tâches",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetBulkForm = () => {
    setBulkAssignName("");
    setBulkAssignRole("");
    setBulkDueDate(undefined);
    setBulkPriority("");
    setBulkStatus("");
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Sequence Task Extractor - AI extraction from video/audio */}
      <SequenceTaskExtractor 
        projectId={projectId} 
        onTasksExtracted={refresh}
      />

      {/* Bulk Actions Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedTasks.length === tasks.length && tasks.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedTasks.length > 0 
                  ? `${selectedTasks.length} tâche(s) sélectionnée(s)`
                  : "Sélectionner tout"
                }
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedTasks.length === 0}
                onClick={() => setAssignDialogOpen(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Assigner
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedTasks.length === 0}
                onClick={() => {
                  setBulkStatus('en contrôle');
                  setAssignDialogOpen(true);
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                En contrôle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <KanbanBoard
          tasks={tasks}
          onTaskUpdate={(taskId, updates) => {
            if (updates && typeof updates === 'object' && 'status' in updates && updates.status) {
              updateTaskStatus(taskId, { status: updates.status as string });
            }
          }}
          onTaskClick={handleTaskClick}
          onRefresh={refresh}
          loading={loading}
        />
      )}

      {/* Bulk Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Modification en masse ({selectedTasks.length} tâche{selectedTasks.length > 1 ? 's' : ''})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Assignee */}
            <div className="space-y-2">
              <Label>Assigner à</Label>
              <Input
                placeholder="Nom de l'intervenant"
                value={bulkAssignName}
                onChange={(e) => setBulkAssignName(e.target.value)}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Corps de métier</Label>
              <Select value={bulkAssignRole} onValueChange={setBulkAssignRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un métier" />
                </SelectTrigger>
                <SelectContent>
                  {WORKER_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Date d'échéance</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !bulkDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bulkDueDate 
                      ? format(bulkDueDate, "dd MMM yyyy", { locale: fr })
                      : "Sélectionner une date"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bulkDueDate}
                    onSelect={setBulkDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={bulkPriority} onValueChange={setBulkPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Changer la priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basse">Basse</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Changer le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="à faire">À faire</SelectItem>
                  <SelectItem value="en cours">En cours</SelectItem>
                  <SelectItem value="en contrôle">En contrôle</SelectItem>
                  <SelectItem value="validé">Validé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleBulkAssign} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
