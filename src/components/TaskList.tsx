import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ChevronRight, Filter, Edit, MapPin, Layers, FolderTree, X, ListChecks, Calendar, User, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { ClassificationCorrectionDialog } from "./ClassificationCorrectionDialog";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { TaskDescriptionEnhancementDialog } from "./TaskDescriptionEnhancementDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface ExtractedTask {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  work_type: "renovation" | "new_build";
  area?: string;
  location?: string;
  image_url?: string;
  family_id?: string;
  category_id?: string;
  subcategory_id?: string;
  source_type?: string;
  due_date?: string | null;
  assigned_to?: string | null;
  assigned_user?: { id: string; email: string; full_name?: string } | null;
  task_families?: { code: string; name: string; id: string };
  task_categories?: { code: string; name: string; id: string };
  task_subcategories?: { code: string; name: string; id: string };
}

interface TaskListProps {
  tasks: ExtractedTask[];
  actions?: React.ReactNode;
  onTaskUpdate?: () => void;
}

export const TaskList = ({ tasks, actions, onTaskUpdate }: TaskListProps) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [selectedFamily, setSelectedFamily] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [selectedTaskForCorrection, setSelectedTaskForCorrection] = useState<ExtractedTask | null>(null);
  const [enhancementDialogOpen, setEnhancementDialogOpen] = useState(false);
  const [selectedTaskForEnhancement, setSelectedTaskForEnhancement] = useState<ExtractedTask | null>(null);
  const [confidenceData, setConfidenceData] = useState<Record<string, { confidence: number; source: string }>>({});
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null);
  const [editingAssignee, setEditingAssignee] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; email: string; full_name?: string }>>([]);
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();

  const isFrench = t('cancel') === 'Annuler';

  // Fetch classification confidence data from logs
  useEffect(() => {
    const fetchConfidenceData = async () => {
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) return;

      const { data: logs, error } = await supabase
        .from('dsc_classification_logs')
        .select('task_id, suggestions, family_match_type, category_match_type, subcategory_match_type')
        .in('task_id', taskIds);

      if (error) {
        console.error('Error fetching confidence data:', error);
        return;
      }

      const confidenceMap: Record<string, { confidence: number; source: string }> = {};
      logs?.forEach(log => {
        let confidence = 0;
        let source = 'exact';

        if (log.suggestions && Array.isArray(log.suggestions) && log.suggestions.length > 0) {
          const suggestions = log.suggestions as Array<{
            family_id: string;
            category_id: string;
            subcategory_id: string;
            confidence: number;
            source: string;
          }>;
          const bestSuggestion = suggestions[0];
          confidence = bestSuggestion.confidence;
          source = bestSuggestion.source;
        } else {
          const matchTypes = [
            log.family_match_type,
            log.category_match_type,
            log.subcategory_match_type
          ];

          if (matchTypes.includes('fallback')) {
            confidence = 0.4;
            source = 'fallback';
          } else if (matchTypes.includes('semantic')) {
            confidence = 0.65;
            source = 'semantic';
          } else if (matchTypes.includes('fuzzy')) {
            confidence = 0.75;
            source = 'fuzzy';
          } else if (matchTypes.every(m => m === 'exact')) {
            confidence = 1.0;
            source = 'exact';
          } else if (matchTypes.includes('learning')) {
            confidence = 0.9;
            source = 'learning';
          } else {
            confidence = 0.5;
            source = 'unknown';
          }
        }

        confidenceMap[log.task_id] = { confidence, source };
      });

      setConfidenceData(confidenceMap);
    };

    if (tasks.length > 0) {
      fetchConfidenceData();
    }
  }, [tasks]);

  // Generate signed URLs for all task images
  useEffect(() => {
    const generateSignedUrls = async () => {
      const urlMap: Record<string, string> = {};
      
      for (const task of tasks) {
        if (task.image_url) {
          try {
            const { data, error } = await supabase.storage
              .from('task-images')
              .createSignedUrl(task.image_url, 3600);
            
            if (data?.signedUrl && !error) {
              urlMap[task.id] = data.signedUrl;
            }
          } catch (err) {
            console.error('Error creating signed URL:', err);
          }
        }
      }
      
      setSignedUrls(urlMap);
    };

    if (tasks.length > 0) {
      generateSignedUrls();
    }
  }, [tasks]);

  // Load available users for assignment
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Load users from auth.users or a team_members table
        // For now, we'll use the current user and potentially team members
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAvailableUsers([{
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name
          }]);
        }
        
        // TODO: Load team members if team_members table exists
        // const { data: teamMembers } = await supabase
        //   .from('team_members')
        //   .select('user_id, users(email, full_name)')
        //   .eq('project_id', projectId);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  // Check if task is overdue
  const isOverdue = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Check if task is due soon (within 7 days)
  const isDueSoon = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);
    today.setHours(0, 0, 0, 0);
    return due >= today && due <= weekFromNow;
  };

  // Update task due date
  const handleUpdateDueDate = async (taskId: string, date: Date | undefined) => {
    try {
      const { error } = await supabase
        .from('extracted_tasks')
        .update({ due_date: date ? date.toISOString() : null })
        .eq('id', taskId);

      if (error) throw error;
      
      setEditingDueDate(null);
      onTaskUpdate?.();
      toast({
        title: '✅ Date mise à jour',
        description: date ? `Échéance: ${format(date, 'PPP', { locale: fr })}` : 'Date d\'échéance supprimée',
      });
    } catch (error) {
      console.error('Error updating due date:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la date',
        variant: 'destructive',
      });
    }
  };

  // Update task assignee
  const handleUpdateAssignee = async (taskId: string, userId: string | null) => {
    try {
      const { error } = await supabase
        .from('extracted_tasks')
        .update({ assigned_to: userId })
        .eq('id', taskId);

      if (error) throw error;
      
      setEditingAssignee(null);
      onTaskUpdate?.();
      toast({
        title: '✅ Assignation mise à jour',
        description: userId ? 'Tâche assignée' : 'Assignation supprimée',
      });
    } catch (error) {
      console.error('Error updating assignee:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'assignation',
        variant: 'destructive',
      });
    }
  };

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    if (selectedFamily !== "all" && task.task_families?.code !== selectedFamily) return false;
    if (selectedCategory !== "all" && task.task_categories?.code !== selectedCategory) return false;
    return true;
  });

  // Extract unique values for filters
  const uniqueFamilies = Array.from(new Set(tasks.map(t => t.task_families?.code).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(tasks.map(t => t.task_categories?.code).filter(Boolean)));

  const resetFilters = () => {
    setSelectedFamily("all");
    setSelectedCategory("all");
  };

  const hasActiveFilters = selectedFamily !== "all" || selectedCategory !== "all";

  // Separate tasks
  const tasksWithCompleteClassification = filteredTasks.filter(task => 
    task.task_families?.code && task.task_categories?.code && task.task_subcategories?.code
  );
  const tasksWithIncompleteClassification = filteredTasks.filter(task => 
    !task.task_families?.code || !task.task_categories?.code || !task.task_subcategories?.code
  );

  // Group tasks by Family
  const grouped = tasksWithCompleteClassification.reduce((acc, task) => {
    const familyKey = task.task_families!.code;
    const categoryKey = task.task_categories!.code;
    const subcategoryKey = task.task_subcategories!.code;

    if (!acc[familyKey]) acc[familyKey] = { 
      info: task.task_families, 
      categories: {},
      taskCount: 0
    };
    acc[familyKey].taskCount++;
    
    if (!acc[familyKey].categories[categoryKey]) acc[familyKey].categories[categoryKey] = {
      info: task.task_categories,
      subcategories: {}
    };
    if (!acc[familyKey].categories[categoryKey].subcategories[subcategoryKey]) {
      acc[familyKey].categories[categoryKey].subcategories[subcategoryKey] = {
        info: task.task_subcategories,
        tasks: []
      };
    }
    acc[familyKey].categories[categoryKey].subcategories[subcategoryKey].tasks.push(task);
    return acc;
  }, {} as Record<string, { info: any; categories: any; taskCount: number }>);

  const toggleFamily = (familyCode: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(familyCode)) {
        newSet.delete(familyCode);
      } else {
        newSet.add(familyCode);
      }
      return newSet;
    });
  };

  // Task Card Component
  const TaskCard = ({ task, variant = "default" }: { task: ExtractedTask; variant?: "default" | "warning" }) => (
    <Card className={`p-4 transition-all duration-200 hover:shadow-md ${
      variant === "warning" 
        ? "border-l-4 border-l-amber-500 bg-amber-500/5" 
        : "border-l-4 border-l-primary/50 hover:border-l-primary"
    }`}>
      <div className="flex gap-4">
        {task.image_url && signedUrls[task.id] && (
          <img 
            src={signedUrls[task.id]} 
            alt={task.title}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h5 className="font-semibold text-foreground truncate">{task.title}</h5>
            {isAdmin && (
              <Button
                size="sm"
                variant={variant === "warning" ? "default" : "ghost"}
                className={variant === "warning" ? "bg-amber-500 hover:bg-amber-600 text-white h-7 px-2" : "h-7 px-2"}
                onClick={() => {
                  setSelectedTaskForCorrection(task);
                  setCorrectionDialogOpen(true);
                }}
              >
                <Edit className="w-3 h-3 mr-1" />
                {variant === "warning" ? (isFrench ? 'Classifier' : 'Classify') : (isFrench ? 'Modifier' : 'Edit')}
              </Button>
            )}
          </div>
          
          {task.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {/* DSC Path for complete tasks */}
            {variant !== "warning" && task.task_families && task.task_categories && task.task_subcategories && (
              <div className="flex items-center gap-1 text-xs">
                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                  {task.task_families.code}
                </Badge>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                  {task.task_categories.code}
                </Badge>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 text-primary">
                  {task.task_subcategories.code}
                </Badge>
              </div>
            )}

            {/* Partial classification for incomplete tasks */}
            {variant === "warning" && task.task_families && (
              <Badge variant="secondary" className="text-xs">
                {task.task_families.code}: {task.task_families.name}
              </Badge>
            )}

            {confidenceData[task.id] && (
              <ConfidenceBadge 
                confidence={confidenceData[task.id].confidence} 
                source={confidenceData[task.id].source}
              />
            )}
            
            {task.location && (
              <Badge variant="outline" className="text-xs gap-1">
                <MapPin className="w-3 h-3" />
                {task.location}
              </Badge>
            )}
          </div>

          {/* Due Date & Assignee */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
            {/* Due Date */}
            <Popover open={editingDueDate === task.id} onOpenChange={(open) => setEditingDueDate(open ? task.id : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 text-xs gap-1.5",
                    task.due_date && isOverdue(task.due_date) && "text-red-600 hover:text-red-700",
                    task.due_date && isDueSoon(task.due_date) && !isOverdue(task.due_date) && "text-amber-600 hover:text-amber-700"
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {task.due_date ? (
                    <span className={cn(
                      isOverdue(task.due_date) && "font-semibold"
                    )}>
                      {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Échéance</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={task.due_date ? new Date(task.due_date) : undefined}
                  onSelect={(date) => handleUpdateDueDate(task.id, date)}
                  initialFocus
                  locale={fr}
                />
                {task.due_date && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleUpdateDueDate(task.id, undefined)}
                    >
                      Supprimer la date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Assignee */}
            <Popover open={editingAssignee === task.id} onOpenChange={(open) => setEditingAssignee(open ? task.id : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                >
                  <User className="w-3 h-3" />
                  {task.assigned_user ? (
                    <span className="truncate max-w-[100px]">
                      {task.assigned_user.full_name || task.assigned_user.email.split('@')[0]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Assigner</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleUpdateAssignee(task.id, null)}
                  >
                    Non assigné
                  </Button>
                  {availableUsers.map(user => (
                    <Button
                      key={user.id}
                      variant={task.assigned_to === user.id ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => handleUpdateAssignee(task.id, user.id)}
                    >
                      {user.full_name || user.email.split('@')[0]}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </Card>
  );

  if (tasks.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ListChecks className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('noTasks')}</h3>
          <p className="text-muted-foreground">{t('noTasksDesc')}</p>
        </Card>
      </div>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ListChecks className="w-6 h-6 text-primary" />
              {isFrench ? 'Tâches extraites' : 'Extracted Tasks'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isFrench 
                ? `${filteredTasks.length} tâche${filteredTasks.length > 1 ? 's' : ''} organisée${filteredTasks.length > 1 ? 's' : ''} selon la nomenclature DSC`
                : `${filteredTasks.length} task${filteredTasks.length > 1 ? 's' : ''} organized by DSC nomenclature`
              }
            </p>
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3 text-center bg-primary/5 border-primary/20">
            <div className="text-2xl font-bold text-primary">{tasks.length}</div>
            <div className="text-xs text-muted-foreground">{isFrench ? 'Total' : 'Total'}</div>
          </Card>
          <Card className="p-3 text-center bg-emerald-500/5 border-emerald-500/20">
            <div className="text-2xl font-bold text-emerald-600">{tasksWithCompleteClassification.length}</div>
            <div className="text-xs text-muted-foreground">{isFrench ? 'Classifiées' : 'Classified'}</div>
          </Card>
          <Card className={`p-3 text-center ${tasksWithIncompleteClassification.length > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/30'}`}>
            <div className={`text-2xl font-bold ${tasksWithIncompleteClassification.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {tasksWithIncompleteClassification.length}
            </div>
            <div className="text-xs text-muted-foreground">{isFrench ? 'À classifier' : 'To classify'}</div>
          </Card>
        </div>

        {/* Filters */}
        {(uniqueFamilies.length > 0 || uniqueCategories.length > 0) && (
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{isFrench ? 'Filtres' : 'Filters'}</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto h-6 px-2 text-xs">
                  <X className="w-3 h-3 mr-1" />
                  {isFrench ? 'Effacer' : 'Clear'}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={isFrench ? 'Famille' : 'Family'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isFrench ? 'Toutes les familles' : 'All families'}</SelectItem>
                  {uniqueFamilies.map(code => (
                    <SelectItem key={code} value={code!}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={isFrench ? 'Catégorie' : 'Category'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isFrench ? 'Toutes les catégories' : 'All categories'}</SelectItem>
                  {uniqueCategories.map(code => (
                    <SelectItem key={code} value={code!}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        )}
      </div>

      {/* Tasks to Classify - PRIORITY SECTION */}
      {tasksWithIncompleteClassification.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-foreground">
              {isFrench ? 'À classifier' : 'To Classify'}
            </h3>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              {tasksWithIncompleteClassification.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {tasksWithIncompleteClassification.map(task => (
              <TaskCard key={task.id} task={task} variant="warning" />
            ))}
          </div>
        </div>
      )}

      {/* Classified Tasks by Family */}
      {Object.keys(grouped).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FolderTree className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              {isFrench ? 'Tâches classifiées' : 'Classified Tasks'}
            </h3>
            <Badge variant="secondary">{tasksWithCompleteClassification.length}</Badge>
          </div>

          <div className="space-y-2">
            {Object.entries(grouped).map(([familyCode, familyData]) => (
              <Collapsible 
                key={familyCode} 
                open={expandedFamilies.has(familyCode)}
                onOpenChange={() => toggleFamily(familyCode)}
              >
                <CollapsibleTrigger asChild>
                  <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {familyData.info?.code}: {familyData.info?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {familyData.taskCount} {isFrench ? 'tâche(s)' : 'task(s)'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${expandedFamilies.has(familyCode) ? 'rotate-90' : ''}`} />
                    </div>
                  </Card>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-4">
                    {Object.entries(familyData.categories).map(([categoryCode, categoryData]: [string, any]) => (
                      <div key={categoryCode}>
                        <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary/50 rounded-full" />
                          {categoryData.info?.code}: {categoryData.info?.name}
                        </div>
                        
                        {Object.entries(categoryData.subcategories).map(([subcategoryCode, subcategoryData]: [string, any]) => (
                          <div key={subcategoryCode} className="ml-4 space-y-2 mb-3">
                            <div className="text-xs text-muted-foreground/80 pl-2 border-l border-border/50">
                              → {subcategoryData.info?.code}: {subcategoryData.info?.name}
                            </div>
                            {subcategoryData.tasks.map((task: ExtractedTask) => (
                              <TaskCard key={task.id} task={task} />
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      {selectedTaskForCorrection && (
        <ClassificationCorrectionDialog
          open={correctionDialogOpen}
          onOpenChange={setCorrectionDialogOpen}
          taskId={selectedTaskForCorrection.id}
          taskTitle={selectedTaskForCorrection.title}
          taskDescription={selectedTaskForCorrection.description}
          currentFamilyId={selectedTaskForCorrection.family_id}
          currentCategoryId={selectedTaskForCorrection.category_id}
          currentSubcategoryId={selectedTaskForCorrection.subcategory_id}
          onSuccess={() => {
            onTaskUpdate?.();
            setSelectedTaskForCorrection(null);
          }}
        />
      )}

      {selectedTaskForEnhancement && (
        <TaskDescriptionEnhancementDialog
          open={enhancementDialogOpen}
          onOpenChange={setEnhancementDialogOpen}
          task={selectedTaskForEnhancement}
          onUpdate={() => {
            onTaskUpdate?.();
          }}
        />
      )}
    </section>
  );
};
