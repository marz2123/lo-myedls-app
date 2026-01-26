import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, RefreshCw, Edit, Filter, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { ClassificationCorrectionDialog } from "@/components/ClassificationCorrectionDialog";

interface TaskToReview {
  id: string;
  task_id: string;
  task_title: string;
  created_at: string;
  confidence: number;
  source: string;
  family_match_type: string;
  category_match_type: string;
  subcategory_match_type: string;
  needs_review: boolean;
  reviewed: boolean;
  matched_family_id: string;
  matched_category_id: string;
  matched_subcategory_id: string;
  family_code?: string;
  family_name?: string;
  category_code?: string;
  category_name?: string;
  subcategory_code?: string;
  subcategory_name?: string;
}

export function ClassificationReviewPanel() {
  const [tasksToReview, setTasksToReview] = useState<TaskToReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [propertyType, setPropertyType] = useState<string>("all");
  const [confidenceLevel, setConfidenceLevel] = useState<string>("all");
  
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';

  const loadTasksToReview = async () => {
    setLoading(true);
    try {
      // Build query with filters
      let query = supabase
        .from('dsc_classification_logs')
        .select(`
          id,
          task_id,
          task_title,
          created_at,
          suggestions,
          family_match_type,
          category_match_type,
          subcategory_match_type,
          needs_review,
          reviewed,
          matched_family_id,
          matched_category_id,
          matched_subcategory_id
        `)
        .eq('needs_review', true)
        .eq('reviewed', false);

      // Apply date filters
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', new Date(dateTo).toISOString());
      }

      const { data: logs, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Load family, category, subcategory details
      const familyIds = [...new Set(logs?.map(l => l.matched_family_id).filter(Boolean))];
      const categoryIds = [...new Set(logs?.map(l => l.matched_category_id).filter(Boolean))];
      const subcategoryIds = [...new Set(logs?.map(l => l.matched_subcategory_id).filter(Boolean))];

      const [familiesRes, categoriesRes, subcategoriesRes] = await Promise.all([
        familyIds.length > 0 ? supabase.from('task_families').select('id, code, name').in('id', familyIds) : { data: [] },
        categoryIds.length > 0 ? supabase.from('task_categories').select('id, code, name').in('id', categoryIds) : { data: [] },
        subcategoryIds.length > 0 ? supabase.from('task_subcategories').select('id, code, name').in('id', subcategoryIds) : { data: [] }
      ]);

      const familiesMap = new Map((familiesRes.data || []).map(f => [f.id, f]));
      const categoriesMap = new Map((categoriesRes.data || []).map(c => [c.id, c]));
      const subcategoriesMap = new Map((subcategoriesRes.data || []).map(s => [s.id, s]));

      // Process logs to extract confidence
      const processedTasks: TaskToReview[] = (logs || []).map(log => {
        let confidence = 0.5;
        let source = 'unknown';

        // Extract confidence from suggestions if available
        if (log.suggestions && Array.isArray(log.suggestions) && log.suggestions.length > 0) {
          const bestSuggestion = log.suggestions[0] as any;
          confidence = bestSuggestion.confidence || 0.5;
          source = bestSuggestion.source || 'unknown';
        } else {
          // Calculate from match types
          const matchTypes = [log.family_match_type, log.category_match_type, log.subcategory_match_type];
          
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
          }
        }

        const family = familiesMap.get(log.matched_family_id);
        const category = categoriesMap.get(log.matched_category_id);
        const subcategory = subcategoriesMap.get(log.matched_subcategory_id);

        return {
          ...log,
          confidence,
          source,
          family_code: family?.code,
          family_name: family?.name,
          category_code: category?.code,
          category_name: category?.name,
          subcategory_code: subcategory?.code,
          subcategory_name: subcategory?.name
        };
      });

      // Apply confidence filter
      let filteredTasks = processedTasks;
      if (confidenceLevel !== "all") {
        filteredTasks = processedTasks.filter(task => {
          if (confidenceLevel === "high") return task.confidence >= 0.8;
          if (confidenceLevel === "medium") return task.confidence >= 0.5 && task.confidence < 0.8;
          if (confidenceLevel === "low") return task.confidence < 0.5;
          return true;
        });
      }

      // Apply property type filter (would need to join with extracted_tasks)
      // For now, we'll filter after loading task details if needed
      
      // Sort by confidence (lowest first)
      filteredTasks.sort((a, b) => a.confidence - b.confidence);

      setTasksToReview(filteredTasks);
    } catch (error) {
      console.error('Error loading tasks to review:', error);
      toast.error(isFrench ? 'Erreur de chargement' : 'Loading error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksToReview();
  }, [dateFrom, dateTo, confidenceLevel]);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPropertyType("all");
    setConfidenceLevel("all");
  };

  const handleOpenCorrection = async (task: TaskToReview) => {
    // Fetch full task details
    const { data: fullTask, error } = await supabase
      .from('extracted_tasks')
      .select('*')
      .eq('id', task.task_id)
      .single();

    if (error || !fullTask) {
      toast.error(isFrench ? 'Erreur de chargement de la tâche' : 'Error loading task');
      return;
    }

    setSelectedTask(fullTask);
    setCorrectionDialogOpen(true);
  };

  const handleCorrectionComplete = () => {
    setCorrectionDialogOpen(false);
    setSelectedTask(null);
    loadTasksToReview(); // Reload list
    toast.success(isFrench ? 'Classification corrigée' : 'Classification corrected');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            {isFrench ? 'Chargement...' : 'Loading...'}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <span className="truncate">{isFrench ? 'Révision des classifications' : 'Classification Review'}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                {isFrench
                  ? `${tasksToReview.length} tâches nécessitent une révision (faible confiance)`
                  : `${tasksToReview.length} tasks require review (low confidence)`}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
              <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className="w-full sm:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                {isFrench ? 'Filtres' : 'Filters'}
              </Button>
              <Button onClick={loadTasksToReview} variant="outline" size="sm" className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                {isFrench ? 'Actualiser' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-6 p-3 md:p-4 border rounded-lg bg-muted/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Filter className="w-4 h-4 flex-shrink-0" />
                  <span>{isFrench ? 'Filtres avancés' : 'Advanced Filters'}</span>
                </h3>
                <Button onClick={clearFilters} variant="ghost" size="sm" className="w-full sm:w-auto">
                  <X className="w-4 h-4 mr-2" />
                  {isFrench ? 'Réinitialiser' : 'Clear'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{isFrench ? 'Période' : 'Period'}</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      placeholder={isFrench ? 'Du' : 'From'}
                      className="text-xs w-full sm:w-auto sm:flex-1"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      placeholder={isFrench ? 'Au' : 'To'}
                      className="text-xs w-full sm:w-auto sm:flex-1"
                    />
                  </div>
                </div>

                {/* Property Type Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{isFrench ? 'Type de propriété' : 'Property Type'}</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className="text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isFrench ? 'Tous les types' : 'All types'}</SelectItem>
                      <SelectItem value="building">{isFrench ? 'Immeuble' : 'Building'}</SelectItem>
                      <SelectItem value="house">{isFrench ? 'Maison' : 'House'}</SelectItem>
                      <SelectItem value="apartment">{isFrench ? 'Appartement' : 'Apartment'}</SelectItem>
                      <SelectItem value="commercial">{isFrench ? 'Commercial' : 'Commercial'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Confidence Level Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{isFrench ? 'Niveau de confiance' : 'Confidence Level'}</Label>
                  <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                    <SelectTrigger className="text-xs w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isFrench ? 'Tous les niveaux' : 'All levels'}</SelectItem>
                      <SelectItem value="low">{isFrench ? 'Faible (< 50%)' : 'Low (< 50%)'}</SelectItem>
                      <SelectItem value="medium">{isFrench ? 'Moyen (50-80%)' : 'Medium (50-80%)'}</SelectItem>
                      <SelectItem value="high">{isFrench ? 'Élevé (≥ 80%)' : 'High (≥ 80%)'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {isFrench 
                  ? `${tasksToReview.length} résultat${tasksToReview.length > 1 ? 's' : ''} trouvé${tasksToReview.length > 1 ? 's' : ''}`
                  : `${tasksToReview.length} result${tasksToReview.length > 1 ? 's' : ''} found`}
              </div>
            </div>
          )}

          {tasksToReview.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">
                {isFrench
                  ? 'Aucune tâche nécessitant une révision'
                  : 'No tasks requiring review'}
              </p>
            </div>
           ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">{isFrench ? 'Tâche' : 'Task'}</TableHead>
                    <TableHead className="min-w-[200px]">{isFrench ? 'Classification actuelle' : 'Current Classification'}</TableHead>
                    <TableHead className="min-w-[100px]">{isFrench ? 'Confiance' : 'Confidence'}</TableHead>
                    <TableHead className="min-w-[100px]">{isFrench ? 'Date' : 'Date'}</TableHead>
                    <TableHead className="text-right min-w-[120px]">{isFrench ? 'Actions' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasksToReview.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate" title={task.task_title}>
                          {task.task_title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              {task.family_code}
                            </Badge>
                            <span className="text-muted-foreground truncate flex-1 min-w-0">{task.family_name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              {task.category_code}
                            </Badge>
                            <span className="text-muted-foreground truncate flex-1 min-w-0">{task.category_name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              {task.subcategory_code}
                            </Badge>
                            <span className="text-muted-foreground truncate flex-1 min-w-0">{task.subcategory_name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ConfidenceBadge confidence={task.confidence} source={task.source} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(task.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleOpenCorrection(task)}
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <Edit className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">{isFrench ? 'Corriger' : 'Correct'}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTask && (
        <ClassificationCorrectionDialog
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          taskDescription={selectedTask.description}
          currentFamilyId={selectedTask.family_id}
          currentCategoryId={selectedTask.category_id}
          currentSubcategoryId={selectedTask.subcategory_id}
          open={correctionDialogOpen}
          onOpenChange={setCorrectionDialogOpen}
          onSuccess={handleCorrectionComplete}
        />
      )}
    </>
  );
}
