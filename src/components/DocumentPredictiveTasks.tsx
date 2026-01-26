import { useState, useEffect } from "react";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileSearch, Loader2, Plus, CheckCircle2, AlertCircle, Clock, 
  FileText, Sparkles, RefreshCw, Check, X, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronRight, Zap, MapPin, FileCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PredictiveTask {
  title: string;
  description: string;
  location_zone?: string;
  location_space?: string;
  priority: "low" | "medium" | "high";
  work_type: string;
  source_document: string;
  source_page?: string;
  source_quote?: string;
  confidence: number;
  family_code?: string;
  family_name?: string;
  category_code?: string;
  category_name?: string;
  subcategory_code?: string;
  subcategory_name?: string;
}

interface DocumentPredictiveTasksProps {
  projectId: string;
  projectDocuments: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  onTasksAdded?: () => void;
}

export function DocumentPredictiveTasks({
  projectId,
  projectDocuments,
  onTasksAdded,
}: DocumentPredictiveTasksProps) {
  const [predictiveTasks, setPredictiveTasks] = useState<PredictiveTask[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState<number | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';

  // Load existing predictive tasks from project data
  useEffect(() => {
    loadExistingTasks();
  }, [projectId]);

  const loadExistingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('template_data')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      const templateData = data?.template_data as any;
      if (templateData?.visit_preparation?.predictive_tasks) {
        setPredictiveTasks(templateData.visit_preparation.predictive_tasks);
        setLastAnalyzedAt(templateData.analyzed_at);
        // Expand all documents by default
        const docs = new Set<string>(templateData.visit_preparation.predictive_tasks.map((t: PredictiveTask) => t.source_document || 'unknown'));
        setExpandedDocs(docs);
      }
    } catch (error) {
      console.error('Error loading predictive tasks:', error);
    }
  };

  const analyzeDocuments = async () => {
    if (projectDocuments.length === 0) {
      toast.error(isFrench ? "Aucun document à analyser" : "No documents to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-project-documents', {
        body: {
          projectId,
          documents: projectDocuments.map(doc => ({
            name: doc.name,
            type: doc.type,
            url: doc.url
          }))
        }
      });

      if (error) throw error;

      if (data?.visit_preparation?.predictive_tasks) {
        setPredictiveTasks(data.visit_preparation.predictive_tasks);
        setLastAnalyzedAt(new Date().toISOString());
        // Expand all documents
        const docs = new Set<string>(data.visit_preparation.predictive_tasks.map((t: PredictiveTask) => t.source_document || 'unknown'));
        setExpandedDocs(docs);
        toast.success(
          isFrench 
            ? `${data.visit_preparation.predictive_tasks.length} tâches prédictives extraites`
            : `${data.visit_preparation.predictive_tasks.length} predictive tasks extracted`
        );
      }
    } catch (error) {
      console.error('Error analyzing documents:', error);
      toast.error(isFrench ? "Erreur lors de l'analyse" : "Analysis error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleDocument = (docName: string) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docName)) {
        newSet.delete(docName);
      } else {
        newSet.add(docName);
      }
      return newSet;
    });
  };

  const validateTask = async (task: PredictiveTask, index: number) => {
    setIsValidating(index);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get taxonomy IDs from task if available
      const taskData: any = {
        title: task.title,
        description: task.description,
        area: task.location_zone,
        location: task.location_space,
        priority: task.priority || 'medium',
        work_type: task.work_type || 'renovation',
        project_id: projectId,
        user_id: user.id,
        source_type: 'document_prediction',
        detection_confidence: task.confidence,
        analysis_metadata: {
          source_document: task.source_document,
          source_page: task.source_page,
          source_quote: task.source_quote,
          family_code: task.family_code,
          category_code: task.category_code,
          subcategory_code: task.subcategory_code
        }
      };

      // Add taxonomy IDs if available (from enriched tasks)
      if ((task as any).family_id) taskData.family_id = (task as any).family_id;
      if ((task as any).category_id) taskData.category_id = (task as any).category_id;
      if ((task as any).subcategory_id) taskData.subcategory_id = (task as any).subcategory_id;

      const { error } = await supabase
        .from('extracted_tasks')
        .insert(taskData);

      if (error) throw error;

      // Remove validated task from the list
      const remainingTasks = predictiveTasks.filter((_, i) => i !== index);
      setPredictiveTasks(remainingTasks);
      await updateProjectTasks(remainingTasks);

      toast.success(isFrench ? "Tâche validée et ajoutée" : "Task validated and added");
      onTasksAdded?.();
    } catch (error) {
      console.error('Error validating task:', error);
      toast.error(isFrench ? "Erreur lors de la validation" : "Validation error");
    } finally {
      setIsValidating(null);
    }
  };

  const rejectTask = async (index: number) => {
    const remainingTasks = predictiveTasks.filter((_, i) => i !== index);
    setPredictiveTasks(remainingTasks);
    await updateProjectTasks(remainingTasks);
    toast.success(isFrench ? "Tâche rejetée" : "Task rejected");
  };

  const updateProjectTasks = async (tasks: PredictiveTask[]) => {
    const templateDataUpdate = {
      visit_preparation: {
        predictive_tasks: tasks
      },
      analyzed_at: lastAnalyzedAt
    };
    
    await supabase
      .from('projects')
      .update({
        template_data: templateDataUpdate as unknown as Json
      })
      .eq('id', projectId);
  };

  const validateAllFromDocument = async (docName: string) => {
    const tasksFromDoc = predictiveTasks.filter(t => (t.source_document || 'unknown') === docName);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const tasksToInsert = tasksFromDoc.map(task => {
        const taskData: any = {
          title: task.title,
          description: task.description,
          area: task.location_zone,
          location: task.location_space,
          priority: task.priority || 'medium',
          work_type: task.work_type || 'renovation',
          project_id: projectId,
          user_id: user.id,
          source_type: 'document_prediction',
          detection_confidence: task.confidence,
          analysis_metadata: {
            source_document: task.source_document,
            source_page: task.source_page,
            source_quote: task.source_quote,
            family_code: task.family_code,
            category_code: task.category_code,
            subcategory_code: task.subcategory_code
          }
        };
        
        // Add taxonomy IDs if available
        if ((task as any).family_id) taskData.family_id = (task as any).family_id;
        if ((task as any).category_id) taskData.category_id = (task as any).category_id;
        if ((task as any).subcategory_id) taskData.subcategory_id = (task as any).subcategory_id;
        
        return taskData;
      });

      const { error } = await supabase.from('extracted_tasks').insert(tasksToInsert);
      if (error) throw error;

      const remainingTasks = predictiveTasks.filter(t => (t.source_document || 'unknown') !== docName);
      setPredictiveTasks(remainingTasks);
      await updateProjectTasks(remainingTasks);

      toast.success(
        isFrench 
          ? `${tasksFromDoc.length} tâche(s) validée(s) depuis ${docName}`
          : `${tasksFromDoc.length} task(s) validated from ${docName}`
      );
      onTasksAdded?.();
    } catch (error) {
      console.error('Error validating tasks:', error);
      toast.error(isFrench ? "Erreur lors de la validation" : "Validation error");
    }
  };

  // Group tasks by source document
  const tasksByDocument = predictiveTasks.reduce((acc, task, index) => {
    const docName = task.source_document || 'Document inconnu';
    if (!acc[docName]) {
      acc[docName] = [];
    }
    acc[docName].push({ ...task, originalIndex: index });
    return acc;
  }, {} as Record<string, (PredictiveTask & { originalIndex: number })[]>);

  const priorityConfig = {
    low: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock, label: isFrench ? 'Basse' : 'Low' },
    medium: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: AlertCircle, label: isFrench ? 'Moyenne' : 'Medium' },
    high: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: AlertCircle, label: isFrench ? 'Haute' : 'High' },
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg animate-fade-in">
      {/* Enhanced Header with Gradient */}
      <CardHeader className="bg-primary text-primary-foreground pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-foreground/20 rounded-xl backdrop-blur-sm">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {isFrench ? 'Tâches prédictives' : 'Predictive Tasks'}
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 mt-0.5">
                {predictiveTasks.length > 0 
                  ? `${predictiveTasks.length} ${isFrench ? 'tâche(s) de' : 'task(s) from'} ${Object.keys(tasksByDocument).length} ${isFrench ? 'document(s)' : 'document(s)'}`
                  : isFrench ? 'Analysez vos documents pour extraire des tâches' : 'Analyze documents to extract tasks'
                }
              </CardDescription>
            </div>
          </div>
          
          <Button
            onClick={analyzeDocuments}
            disabled={isAnalyzing || projectDocuments.length === 0}
            className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 backdrop-blur-sm shadow-lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isFrench ? 'Analyse...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                {isFrench ? 'Analyser' : 'Analyze'}
              </>
            )}
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-primary-foreground/20 text-sm text-primary-foreground/70">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>{projectDocuments.length} {isFrench ? 'documents' : 'documents'}</span>
          </div>
          {lastAnalyzedAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{new Date(lastAnalyzedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {predictiveTasks.length === 0 ? (
          /* Empty state */
          <div className="p-10 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <FileCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium mb-1">
              {isFrench ? 'Aucune tâche prédictive' : 'No predictive tasks'}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {projectDocuments.length === 0 
                ? isFrench ? "Ajoutez des documents pour commencer" : "Add documents to start"
                : isFrench ? 'Cliquez sur "Analyser" pour extraire des tâches' : 'Click "Analyze" to extract tasks'
              }
            </p>
          </div>
        ) : (
          /* Tasks list */
          <div className="divide-y divide-border">
            {Object.entries(tasksByDocument).map(([docName, tasks]) => (
              <Collapsible 
                key={docName} 
                open={expandedDocs.has(docName)}
                onOpenChange={() => toggleDocument(docName)}
              >
                {/* Document header - improved */}
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground line-clamp-1">{docName}</p>
                        <p className="text-sm text-muted-foreground">
                          {tasks.length} {isFrench ? 'tâche(s) prédictive(s)' : 'predictive task(s)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          validateAllFromDocument(docName);
                        }}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        {isFrench ? 'Tout valider' : 'Validate all'}
                      </Button>
                      {expandedDocs.has(docName) ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* Tasks from this document - improved */}
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    {tasks.map((task) => {
                      const PriorityIcon = priorityConfig[task.priority]?.icon || Clock;
                      const isValidatingThis = isValidating === task.originalIndex;
                      const hasDSC = task.family_name || task.category_name || task.subcategory_name;
                      
                      return (
                        <div
                          key={task.originalIndex}
                          className="group p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 animate-fade-in"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Task title */}
                              <h4 className="font-medium text-foreground mb-1.5 line-clamp-2">
                                {task.title}
                              </h4>
                              
                              {/* DSC Classification path */}
                              {hasDSC && (
                                <p className="text-xs text-primary/80 mb-2 font-medium">
                                  {[task.family_name, task.category_name, task.subcategory_name].filter(Boolean).join(' > ')}
                                </p>
                              )}
                              
                              {/* Task description */}
                              {task.description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              
                              {/* Source quote - extracted text from document */}
                              {task.source_quote && (
                                <div className="bg-muted/50 rounded-lg p-2.5 mb-3 border-l-2 border-primary/30">
                                  <p className="text-xs text-muted-foreground italic line-clamp-2">
                                    "{task.source_quote}"
                                  </p>
                                  {task.source_page && (
                                    <span className="text-xs text-muted-foreground/70 mt-1 block">
                                      — Page {task.source_page}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Badges row */}
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Priority badge */}
                                {task.priority && (
                                  <Badge variant="outline" className={priorityConfig[task.priority]?.color}>
                                    <PriorityIcon className="w-3 h-3 mr-1" />
                                    {priorityConfig[task.priority]?.label}
                                  </Badge>
                                )}
                                
                                {/* Location badges */}
                                {task.location_zone && (
                                  <Badge variant="outline" className="bg-secondary/50">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {task.location_zone}
                                  </Badge>
                                )}
                                
                                {task.location_space && (
                                  <Badge variant="outline" className="bg-secondary/50">
                                    {task.location_space}
                                  </Badge>
                                )}
                                
                                {/* Confidence badge */}
                                <Badge variant="outline" className={getConfidenceColor(task.confidence)}>
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  {task.confidence}%
                                </Badge>
                                
                                {/* Page reference (if no quote shown) */}
                                {task.source_page && !task.source_quote && (
                                  <span className="text-xs text-muted-foreground">
                                    Page {task.source_page}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                size="sm"
                                onClick={() => validateTask(task, task.originalIndex)}
                                disabled={isValidatingThis}
                                className="bg-green-600 hover:bg-green-700 text-white shadow-sm h-9 w-9 p-0"
                                title={isFrench ? 'Valider cette tâche' : 'Validate this task'}
                              >
                                {isValidatingThis ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ThumbsUp className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                onClick={() => rejectTask(task.originalIndex)}
                                title={isFrench ? 'Rejeter cette tâche' : 'Reject this task'}
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
