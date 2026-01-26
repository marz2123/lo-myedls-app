import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, Loader2, Plus, Check, X, Building2, 
  MapPin, Zap, ChevronRight, Clock, FileText,
  Layers, Home, Car, Trees, Package, MoreHorizontal
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

interface BuildingComposition {
  common_areas?: string[];
  apartments?: string[];
  basements?: string[];
  parking?: string[];
  gardens?: string[];
  others?: string[];
}

interface PredictiveTask {
  title: string;
  description?: string;
  location?: string;
  location_zone?: string;
  location_space?: string;
  priority: "low" | "medium" | "high";
  work_type?: string;
  source_document?: string;
  source_type?: "document" | "suggestion";
  family_name?: string;
  category_name?: string;
  subcategory_name?: string;
  confidence: number;
}

interface AnalysisSummary {
  total_tasks?: number;
  extracted_from_docs?: number;
  ai_suggestions?: number;
  high_priority?: number;
  documents_processed?: number;
  key_findings?: string[];
  recommendations?: string[];
}

interface AIPredictionsPanelProps {
  projectId: string;
  propertyType: string;
  address: string;
  numberOfUnits?: number;
  projectDocuments?: Array<{ id: string; name: string; type: string; url: string }>;
  buildingComposition?: BuildingComposition | null;
  onCompositionSave?: (composition: BuildingComposition) => void;
  onTaskAdded?: () => void;
}

const categoryConfig = {
  common_areas: { icon: Building2, label: "Parties communes", color: "bg-blue-500" },
  apartments: { icon: Home, label: "Logements", color: "bg-green-500" },
  basements: { icon: Layers, label: "Caves", color: "bg-amber-500" },
  parking: { icon: Car, label: "Parkings", color: "bg-purple-500" },
  gardens: { icon: Trees, label: "Espaces extérieurs", color: "bg-emerald-500" },
  others: { icon: Package, label: "Autres", color: "bg-gray-500" },
};

export function AIPredictionsPanel({
  projectId,
  propertyType,
  address,
  numberOfUnits,
  projectDocuments = [],
  buildingComposition,
  onCompositionSave,
  onTaskAdded,
}: AIPredictionsPanelProps) {
  const [activeTab, setActiveTab] = useState<"structure" | "tasks">("structure");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedStructure, setSuggestedStructure] = useState<BuildingComposition | null>(null);
  const [predictiveTasks, setPredictiveTasks] = useState<PredictiveTask[]>([]);
  const [validatingIndex, setValidatingIndex] = useState<number | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';

  // Load existing predictions
  useEffect(() => {
    loadExistingPredictions();
  }, [projectId]);

  const loadExistingPredictions = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('template_data')
        .eq('id', projectId)
        .single();

      const templateData = data?.template_data as any;
      if (templateData?.visit_preparation?.predictive_tasks) {
        setPredictiveTasks(templateData.visit_preparation.predictive_tasks);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
    }
  };

  // UNIFIED AI ANALYSIS - Structure + Tasks in one intelligent pass
  const runUnifiedAnalysis = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-unified-analysis', {
        body: { projectId }
      });

      if (error) throw error;

      // Update structure with proper key mapping
      if (data?.building_structure) {
        const mappedStructure: BuildingComposition = {
          common_areas: data.building_structure.commonAreas || [],
          apartments: data.building_structure.apartments || [],
          basements: data.building_structure.basements || [],
          parking: data.building_structure.parking || [],
          gardens: data.building_structure.gardens || [],
          others: data.building_structure.others || [],
        };
        setSuggestedStructure(mappedStructure);
      }

      // Update tasks
      if (data?.predictive_tasks) {
        setPredictiveTasks(data.predictive_tasks);
      }

      // Update summary
      if (data?.summary) {
        setAnalysisSummary(data.summary);
      }

      const taskCount = data?.predictive_tasks?.length || 0;
      const docCount = data?.summary?.documents_processed || 0;
      toast.success(
        isFrench 
          ? `Analyse complète: ${taskCount} tâches, ${docCount} documents` 
          : `Full analysis: ${taskCount} tasks, ${docCount} documents`
      );
    } catch (error: any) {
      console.error('Error in unified analysis:', error);
      if (error.message?.includes('429')) {
        toast.error(isFrench ? "Trop de requêtes, réessayez" : "Rate limited, try again");
      } else if (error.message?.includes('402')) {
        toast.error(isFrench ? "Crédits insuffisants" : "Insufficient credits");
      } else {
        toast.error(isFrench ? "Erreur d'analyse" : "Analysis error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const applyStructure = () => {
    if (suggestedStructure && onCompositionSave) {
      onCompositionSave(suggestedStructure);
      setSuggestedStructure(null);
      toast.success(isFrench ? "Structure appliquée" : "Structure applied");
    }
  };

  const validateTask = async (task: PredictiveTask, index: number) => {
    setValidatingIndex(index);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('extracted_tasks').insert({
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
      });

      const remaining = predictiveTasks.filter((_, i) => i !== index);
      setPredictiveTasks(remaining);
      await updateProjectTasks(remaining);
      toast.success(isFrench ? "Tâche ajoutée" : "Task added");
      onTaskAdded?.();
    } catch (error) {
      console.error('Error validating task:', error);
      toast.error(isFrench ? "Erreur" : "Error");
    } finally {
      setValidatingIndex(null);
    }
  };

  const rejectTask = async (index: number) => {
    const remaining = predictiveTasks.filter((_, i) => i !== index);
    setPredictiveTasks(remaining);
    await updateProjectTasks(remaining);
  };

  const validateAllTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const tasksToInsert = predictiveTasks.map(task => ({
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
      }));

      await supabase.from('extracted_tasks').insert(tasksToInsert);
      setPredictiveTasks([]);
      await updateProjectTasks([]);
      toast.success(`${tasksToInsert.length} ${isFrench ? 'tâches ajoutées' : 'tasks added'}`);
      onTaskAdded?.();
    } catch (error) {
      console.error('Error validating all tasks:', error);
      toast.error(isFrench ? "Erreur" : "Error");
    }
  };

  const updateProjectTasks = async (tasks: PredictiveTask[]) => {
    await supabase.from('projects').update({
      template_data: { visit_preparation: { predictive_tasks: tasks } } as unknown as Json
    }).eq('id', projectId);
  };

  const displayStructure = suggestedStructure || buildingComposition;
  const hasStructure = displayStructure && Object.values(displayStructure).some(arr => arr && arr.length > 0);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header with unified action */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {isFrench ? "Analyse IA Complète" : "Complete AI Analysis"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isFrench 
                  ? `Documents, métadonnées, composition → Structure + Tâches` 
                  : `Documents, metadata, composition → Structure + Tasks`}
              </p>
            </div>
          </div>
          <Button
            onClick={runUnifiedAnalysis}
            disabled={isLoading}
            size="sm"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            {isLoading 
              ? (isFrench ? "Analyse..." : "Analyzing...") 
              : (isFrench ? "Analyser tout" : "Analyze all")}
          </Button>
        </div>

        {/* Summary badges */}
        {analysisSummary && (
          <div className="flex flex-wrap gap-2 mt-3">
            {analysisSummary.documents_processed !== undefined && (
              <Badge variant="secondary" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {analysisSummary.documents_processed} docs
              </Badge>
            )}
            {analysisSummary.extracted_from_docs !== undefined && (
              <Badge variant="secondary" className="text-xs">
                {analysisSummary.extracted_from_docs} extraites
              </Badge>
            )}
            {analysisSummary.ai_suggestions !== undefined && (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                {analysisSummary.ai_suggestions} suggestions
              </Badge>
            )}
            {analysisSummary.high_priority !== undefined && analysisSummary.high_priority > 0 && (
              <Badge variant="outline" className="text-xs border-red-500/30 text-red-600">
                {analysisSummary.high_priority} urgentes
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("structure")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
            activeTab === "structure" 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>{isFrench ? "Structure" : "Structure"}</span>
          </div>
          {activeTab === "structure" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
            activeTab === "tasks" 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{isFrench ? "Tâches" : "Tasks"}</span>
            {predictiveTasks.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {predictiveTasks.length}
              </Badge>
            )}
          </div>
          {activeTab === "tasks" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "structure" ? (
          <div className="space-y-4">
            {/* Structure display */}
            {hasStructure ? (
              <div className="space-y-3">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const items = displayStructure?.[key as keyof BuildingComposition];
                  if (!items || items.length === 0) return null;

                  const Icon = config.icon;
                  return (
                    <div key={key} className="rounded-xl border border-border p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("p-1.5 rounded-lg", config.color, "bg-opacity-10")}>
                          <Icon className={cn("h-3.5 w-3.5", config.color.replace("bg-", "text-"))} />
                        </div>
                        <span className="text-sm font-medium">{config.label}</span>
                        <Badge variant="secondary" className="ml-auto h-5 text-xs">
                          {items.length}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-xs font-normal bg-background"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Apply button for suggested structure */}
                {suggestedStructure && (
                  <div className="flex gap-2 pt-2">
                    <Button onClick={applyStructure} className="flex-1">
                      <Check className="mr-2 h-4 w-4" />
                      {isFrench ? "Appliquer" : "Apply"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSuggestedStructure(null)}
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {isFrench 
                    ? "Générez une structure du bâtiment basée sur vos documents" 
                    : "Generate building structure based on your documents"
                  }
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with validate all */}
            {predictiveTasks.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {predictiveTasks.length} {isFrench ? "tâches à valider" : "tasks to validate"}
                </p>
                <Button onClick={validateAllTasks} size="sm" variant="default">
                  <Check className="mr-2 h-4 w-4" />
                  {isFrench ? "Tout valider" : "Validate all"}
                </Button>
              </div>
            )}

            {/* Tasks list */}
            {predictiveTasks.length > 0 ? (
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-2">
                  {predictiveTasks.map((task, index) => (
                    <div
                      key={index}
                      className="group rounded-xl border border-border p-3 hover:border-primary/30 hover:bg-muted/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground line-clamp-1">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {(task.location || task.location_zone) && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                <MapPin className="h-2.5 w-2.5 mr-1" />
                                {task.location || task.location_zone}
                              </Badge>
                            )}
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] h-5",
                                task.priority === "high" && "border-red-500/30 text-red-600",
                                task.priority === "medium" && "border-yellow-500/30 text-yellow-600",
                                task.priority === "low" && "border-blue-500/30 text-blue-600"
                              )}
                            >
                              {task.priority === "high" ? "Haute" : task.priority === "medium" ? "Moyenne" : "Basse"}
                            </Badge>
                            {task.source_type === "suggestion" && (
                              <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">
                                <Sparkles className="h-2.5 w-2.5 mr-1" />
                                IA
                              </Badge>
                            )}
                            {task.family_name && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {task.family_name}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {task.confidence}%
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => rejectTask(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50"
                            onClick={() => validateTask(task, index)}
                            disabled={validatingIndex === index}
                          >
                            {validatingIndex === index ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {projectDocuments.length === 0 
                    ? (isFrench ? "Ajoutez des documents au projet" : "Add documents to the project")
                    : (isFrench ? "Analysez vos documents pour extraire des tâches" : "Analyze documents to extract tasks")
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
