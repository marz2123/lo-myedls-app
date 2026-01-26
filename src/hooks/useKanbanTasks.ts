import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanbanTask } from '@/components/kanban/KanbanTaskCard';
import { toast } from 'sonner';

interface UseKanbanTasksOptions {
  projectId?: string;
}

export const useKanbanTasks = ({ projectId }: UseKanbanTasksOptions = {}) => {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load extracted tasks (sans JOIN sur users car la FK peut ne pas exister)
      const { data: extractedTasks, error: extractedError } = await supabase
        .from('extracted_tasks')
        .select(`
          id,
          title,
          description,
          location,
          priority,
          work_type,
          area,
          family_id,
          category_id,
          subcategory_id,
          source_type,
          due_date,
          assigned_to
        `)
        .eq('project_id', projectId);

      if (extractedError) throw extractedError;

      // Load problem tasks
      const { data: problemTasks, error: problemError } = await supabase
        .from('problem_tasks')
        .select(`
          id,
          title,
          description,
          priority,
          status,
          work_type,
          location_id,
          family_id,
          category_id,
          subcategory_id
        `)
        .eq('project_id', projectId);

      if (problemError) throw problemError;

      // Load family names from DTC
      const { data: families } = await supabase
        .from('ft_familles')
        .select('id, ft_label, ft_code');

      const familyMap = new Map(families?.map(f => [f.id, { name: f.ft_label, code: f.ft_code }]) || []);

      // Load category names from DTC
      const { data: categories } = await supabase
        .from('ct_categories')
        .select('id, ct_label');

      const categoryMap = new Map(categories?.map(c => [c.id, c.ct_label]) || []);

      // Load subcategory names from DTC
      const { data: subcategories } = await supabase
        .from('sc_sous_categories')
        .select('id, sc_label');

      const subcategoryMap = new Map(subcategories?.map(s => [s.id, s.sc_label]) || []);

      // Transform extracted tasks to Kanban format
      const kanbanFromExtracted: KanbanTask[] = (extractedTasks || []).map(task => {
        const family = task.family_id ? familyMap.get(task.family_id) : null;
        return {
          id: task.id,
          taskName: task.title,
          familyCode: family?.code || 'F-ÀVérifier',
          familyName: family?.name || 'À vérifier',
          category: task.category_id ? categoryMap.get(task.category_id) : undefined,
          subCategory: task.subcategory_id ? subcategoryMap.get(task.subcategory_id) : undefined,
          pieceOrZone: task.location || task.area || 'Non localisé',
          priority: (task.priority as KanbanTask['priority']) || 'normale',
          status: 'à faire',
          description: task.description || undefined,
          observations: task.work_type ? `Type: ${task.work_type}` : undefined,
        };
      });

      // Transform problem tasks to Kanban format
      const kanbanFromProblems: KanbanTask[] = (problemTasks || []).map(task => {
        const family = task.family_id ? familyMap.get(task.family_id) : null;
        return {
          id: task.id,
          taskName: task.title,
          familyCode: family?.code || 'F-ÀVérifier',
          familyName: family?.name || 'À vérifier',
          category: task.category_id ? categoryMap.get(task.category_id) : undefined,
          subCategory: task.subcategory_id ? subcategoryMap.get(task.subcategory_id) : undefined,
          pieceOrZone: 'Problème identifié',
          priority: (task.priority as KanbanTask['priority']) || 'normale',
          status: task.status || 'à faire',
          description: task.description || undefined,
          observations: task.work_type ? `Type: ${task.work_type}` : undefined,
          due_date: task.due_date || null,
          assigned_to: task.assigned_to || null,
          assigned_user: null, // problem_tasks might not have assigned_to
        };
      });

      setTasks([...kanbanFromExtracted, ...kanbanFromProblems]);
    } catch (err) {
      console.error('Error loading kanban tasks:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      toast.error('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateTaskStatus = useCallback(async (taskId: string, updates: Partial<KanbanTask>) => {
    try {
      // Try to update in problem_tasks first
      const { error: problemError } = await supabase
        .from('problem_tasks')
        .update({ status: updates.status })
        .eq('id', taskId);

      if (problemError) {
        // If not found in problem_tasks, it might be an extracted task
        // For extracted tasks, we'd need a different update mechanism
        console.log('Task might be from extracted_tasks, status update not persisted');
      }

      // Update local state optimistically
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
    } catch (err) {
      console.error('Error updating task:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    loading,
    error,
    refresh: loadTasks,
    updateTaskStatus,
  };
};
