import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, ListChecks, ChevronRight, Search, 
  Trash2, Loader2, Package, Folder, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkedTask {
  id: string;
  title: string;
  description?: string;
  family_name?: string;
  category_name?: string;
  subcategory_name?: string;
  status?: string;
  priority?: string;
}

interface TaskFamily {
  id: string;
  code: string;
  name: string;
}

interface TaskCategory {
  id: string;
  family_id: string;
  code: string;
  name: string;
}

interface TaskSubcategory {
  id: string;
  category_id: string;
  code: string;
  name: string;
}

interface LinkedTasksBlockProps {
  itemId: string;
  itemType: 'media' | 'sequence' | 'note';
  projectId: string;
  onTasksChange?: () => void;
}

export const LinkedTasksBlock: React.FC<LinkedTasksBlockProps> = ({
  itemId,
  itemType,
  projectId,
  onTasksChange,
}) => {
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // DSC data
  const [families, setFamilies] = useState<TaskFamily[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [subcategories, setSubcategories] = useState<TaskSubcategory[]>([]);
  
  // Selection state
  const [selectedFamily, setSelectedFamily] = useState<TaskFamily | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [step, setStep] = useState<'family' | 'category' | 'subcategory'>('family');

  // Load linked tasks
  const loadLinkedTasks = useCallback(async () => {
    setLoading(true);
    try {
      // Get tasks linked to this item via problem_tasks
      // We store the source_item_id in metadata or use sequence_id for sequences
      let query = supabase
        .from('problem_tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          family:task_families(code, name),
          category:task_categories(code, name),
          subcategory:task_subcategories(code, name)
        `)
        .eq('project_id', projectId);

      // Filter based on item type
      if (itemType === 'sequence') {
        // Get problem_id from identified_problems linked to this sequence
        const { data: problems } = await supabase
          .from('identified_problems')
          .select('id')
          .eq('sequence_id', itemId);
        
        if (problems && problems.length > 0) {
          const problemIds = problems.map(p => p.id);
          query = query.in('problem_id', problemIds);
        } else {
          // No problems linked, return empty
          setLinkedTasks([]);
          setLoading(false);
          return;
        }
      } else {
        // For media/notes, check if there's a link stored in metadata
        // Using a JSONB query to find tasks with matching source_item_id
        query = query.contains('photo_urls', [itemId]);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const tasks: LinkedTask[] = (data || []).map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        family_name: task.family?.name,
        category_name: task.category?.name,
        subcategory_name: task.subcategory?.name,
      }));

      setLinkedTasks(tasks);
    } catch (error) {
      console.error('Error loading linked tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [itemId, itemType, projectId]);

  // Load DSC taxonomy
  const loadDSCData = useCallback(async () => {
    try {
      const [familiesRes, categoriesRes, subcategoriesRes] = await Promise.all([
        supabase.from('task_families').select('id, code, name').order('code'),
        supabase.from('task_categories').select('id, family_id, code, name').order('code'),
        supabase.from('task_subcategories').select('id, category_id, code, name').order('code'),
      ]);

      if (familiesRes.data) setFamilies(familiesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (subcategoriesRes.data) setSubcategories(subcategoriesRes.data);
    } catch (error) {
      console.error('Error loading DSC data:', error);
    }
  }, []);

  useEffect(() => {
    loadLinkedTasks();
  }, [loadLinkedTasks]);

  useEffect(() => {
    if (isDialogOpen && families.length === 0) {
      loadDSCData();
    }
  }, [isDialogOpen, families.length, loadDSCData]);

  // Reset dialog state when opened
  useEffect(() => {
    if (isDialogOpen) {
      setStep('family');
      setSelectedFamily(null);
      setSelectedCategory(null);
      setSearchQuery('');
    }
  }, [isDialogOpen]);

  const handleFamilySelect = (family: TaskFamily) => {
    setSelectedFamily(family);
    setSelectedCategory(null);
    setStep('category');
  };

  const handleCategorySelect = (category: TaskCategory) => {
    setSelectedCategory(category);
    setStep('subcategory');
  };

  const handleSubcategorySelect = async (subcategory: TaskSubcategory) => {
    if (!selectedFamily || !selectedCategory) return;
    setIsAdding(true);

    try {
      // First, create or get a problem for this item
      let problemId: string;

      if (itemType === 'sequence') {
        // Check if problem exists for this sequence
        const { data: existingProblem } = await supabase
          .from('identified_problems')
          .select('id')
          .eq('sequence_id', itemId)
          .maybeSingle();

        if (existingProblem) {
          problemId = existingProblem.id;
        } else {
          // Create a new problem
          const { data: newProblem, error: problemError } = await supabase
            .from('identified_problems')
            .insert({
              project_id: projectId,
              sequence_id: itemId,
              title: `Problème lié à la séquence`,
              severity: 'medium',
              ai_detected: false,
              is_confirmed: true,
            })
            .select('id')
            .single();

          if (problemError) throw problemError;
          problemId = newProblem.id;
        }
      } else {
        // For media/notes, create a generic problem
        const { data: newProblem, error: problemError } = await supabase
          .from('identified_problems')
          .insert({
            project_id: projectId,
            title: `Problème lié au ${itemType === 'note' ? 'note' : 'média'}`,
            severity: 'medium',
            ai_detected: false,
            is_confirmed: true,
            photo_urls: itemType === 'media' ? [itemId] : [],
          })
          .select('id')
          .single();

        if (problemError) throw problemError;
        problemId = newProblem.id;
      }

      // Create the task
      const { error: taskError } = await supabase
        .from('problem_tasks')
        .insert({
          project_id: projectId,
          problem_id: problemId,
          title: subcategory.name,
          family_id: selectedFamily.id,
          category_id: selectedCategory.id,
          subcategory_id: subcategory.id,
          status: 'pending',
          priority: 'medium',
          photo_urls: itemType === 'media' ? [itemId] : [],
        });

      if (taskError) throw taskError;

      toast.success('Tâche ajoutée');
      setIsDialogOpen(false);
      loadLinkedTasks();
      onTasksChange?.();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Erreur lors de l\'ajout de la tâche');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('problem_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Tâche supprimée');
      setLinkedTasks(prev => prev.filter(t => t.id !== taskId));
      onTasksChange?.();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Filter based on search
  const filteredFamilies = families.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = selectedFamily
    ? categories.filter(c => 
        c.family_id === selectedFamily.id &&
        (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.code.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const filteredSubcategories = selectedCategory
    ? subcategories.filter(s => 
        s.category_id === selectedCategory.id &&
        (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.code.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-600 border-red-300';
      case 'high': return 'bg-amber-500/10 text-amber-600 border-amber-300';
      case 'medium': return 'bg-blue-500/10 text-blue-600 border-blue-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Tâches liées
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-3 w-3" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : linkedTasks.length > 0 ? (
        <div className="space-y-2">
          {linkedTasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                {(task.family_name || task.category_name || task.subcategory_name) && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    {task.family_name && <span>{task.family_name}</span>}
                    {task.category_name && (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        <span>{task.category_name}</span>
                      </>
                    )}
                    {task.subcategory_name && (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        <span className="truncate">{task.subcategory_name}</span>
                      </>
                    )}
                  </div>
                )}
                {task.priority && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px] mt-2", getPriorityColor(task.priority))}
                  >
                    {task.priority === 'urgent' ? 'Urgente' : 
                     task.priority === 'high' ? 'Haute' : 
                     task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => handleDeleteTask(task.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-muted/30 border border-dashed text-center">
          <ListChecks className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucune tâche liée</p>
          <Button
            variant="link"
            size="sm"
            className="mt-1 text-xs"
            onClick={() => setIsDialogOpen(true)}
          >
            Ajouter une tâche FT/CT/ST
          </Button>
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Ajouter une tâche
            </DialogTitle>
          </DialogHeader>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm py-2 border-b">
            <Badge 
              variant={step === 'family' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => {
                setStep('family');
                setSelectedFamily(null);
                setSelectedCategory(null);
              }}
            >
              <Package className="h-3 w-3 mr-1" />
              FT
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Badge 
              variant={step === 'category' ? 'default' : 'secondary'}
              className={cn(!selectedFamily && 'opacity-50')}
              onClick={() => selectedFamily && setStep('category')}
            >
              <Folder className="h-3 w-3 mr-1" />
              CT
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Badge 
              variant={step === 'subcategory' ? 'default' : 'secondary'}
              className={cn(!selectedCategory && 'opacity-50')}
              onClick={() => selectedCategory && setStep('subcategory')}
            >
              <FileText className="h-3 w-3 mr-1" />
              ST
            </Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Current Selection */}
          {(selectedFamily || selectedCategory) && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {selectedFamily && (
                <Badge variant="outline" className="gap-1">
                  <Package className="h-3 w-3" />
                  {selectedFamily.code} - {selectedFamily.name}
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="outline" className="gap-1">
                  <Folder className="h-3 w-3" />
                  {selectedCategory.code} - {selectedCategory.name}
                </Badge>
              )}
            </div>
          )}

          <ScrollArea className="h-[300px] pr-4">
            {/* Family Selection */}
            {step === 'family' && (
              <div className="space-y-2">
                {filteredFamilies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {families.length === 0 ? 'Chargement...' : 'Aucun résultat'}
                  </p>
                ) : (
                  filteredFamilies.map((family) => (
                    <button
                      key={family.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/30 border-transparent hover:bg-muted/50 transition-all text-left"
                      onClick={() => handleFamilySelect(family)}
                    >
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{family.code}</p>
                        <p className="font-medium text-sm truncate">{family.name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Category Selection */}
            {step === 'category' && (
              <div className="space-y-2">
                <button
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
                  onClick={() => {
                    setStep('family');
                    setSelectedFamily(null);
                  }}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Retour aux familles
                </button>
                {filteredCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune catégorie trouvée
                  </p>
                ) : (
                  filteredCategories.map((category) => (
                    <button
                      key={category.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/30 border-transparent hover:bg-muted/50 transition-all text-left"
                      onClick={() => handleCategorySelect(category)}
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Folder className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{category.code}</p>
                        <p className="font-medium text-sm truncate">{category.name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Subcategory Selection */}
            {step === 'subcategory' && (
              <div className="space-y-2">
                <button
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
                  onClick={() => setStep('category')}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Retour aux catégories
                </button>
                {filteredSubcategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune sous-catégorie trouvée
                  </p>
                ) : (
                  filteredSubcategories.map((subcategory) => (
                    <button
                      key={subcategory.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/30 border-transparent hover:bg-muted/50 transition-all text-left"
                      onClick={() => handleSubcategorySelect(subcategory)}
                      disabled={isAdding}
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <FileText className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{subcategory.code}</p>
                        <p className="font-medium text-sm truncate">{subcategory.name}</p>
                      </div>
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
