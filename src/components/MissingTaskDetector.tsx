import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Plus, Loader2, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MissingTask {
  title: string;
  description: string;
  area: string;
  location: string;
  priority: string;
  work_type: string;
  family: { code: string; name: string };
  category: { code: string; name: string };
  subcategory: { code: string; name: string };
  occurrence_rate: number;
  found_in_projects: number;
}

interface MissingTaskDetectorProps {
  projectId: string;
  onTaskAdded?: () => void;
}

export function MissingTaskDetector({ projectId, onTaskAdded }: MissingTaskDetectorProps) {
  const [missingTasks, setMissingTasks] = useState<MissingTask[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [similarProjectsCount, setSimilarProjectsCount] = useState(0);

  const detectMissingTasks = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-missing-tasks', {
        body: { projectId }
      });

      if (error) throw error;

      setMissingTasks(data.missing_tasks || []);
      setSimilarProjectsCount(data.similar_projects_analyzed || 0);
      setAnalyzed(true);

      if (data.missing_tasks?.length === 0) {
        toast.success("Aucune tâche manquante détectée - inspection complète !");
      } else {
        toast.success(`${data.missing_tasks.length} tâches potentiellement manquantes détectées`);
      }
    } catch (error) {
      console.error('Error detecting missing tasks:', error);
      toast.error("Erreur lors de la détection des tâches manquantes");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addMissingTask = async (task: MissingTask, index: number) => {
    const taskKey = `${index}-${task.title}`;
    setAddingTaskId(taskKey);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Find taxonomy IDs
      const { data: familyData } = await supabase
        .from('task_families')
        .select('id')
        .eq('code', task.family.code)
        .single();

      const { data: categoryData } = await supabase
        .from('task_categories')
        .select('id')
        .eq('code', task.category.code)
        .single();

      const { data: subcategoryData } = await supabase
        .from('task_subcategories')
        .select('id')
        .eq('code', task.subcategory.code)
        .single();

      const { error } = await supabase
        .from('extracted_tasks')
        .insert({
          title: task.title,
          description: task.description,
          area: task.area,
          location: task.location,
          priority: task.priority,
          work_type: task.work_type,
          family_id: familyData?.id,
          category_id: categoryData?.id,
          subcategory_id: subcategoryData?.id,
          project_id: projectId,
          user_id: user.id,
          source_type: 'missing_task_detection'
        });

      if (error) throw error;

      toast.success("Tâche ajoutée avec succès");
      setMissingTasks(prev => prev.filter((_, i) => i !== index));
      onTaskAdded?.();
    } catch (error) {
      console.error('Error adding missing task:', error);
      toast.error("Erreur lors de l'ajout de la tâche");
    } finally {
      setAddingTaskId(null);
    }
  };

  if (!analyzed) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-base sm:text-lg mb-2">Détection des tâches manquantes</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Analysez vos inspections similaires complétées pour identifier les tâches potentiellement oubliées
            </p>
          </div>
          <Button 
            onClick={detectMissingTasks} 
            disabled={isAnalyzing}
            className="gap-2 w-full sm:w-auto text-sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Analyse en cours...</span>
                <span className="sm:hidden">Analyse...</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Détecter les tâches manquantes</span>
                <span className="sm:hidden">Détecter</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Tâches potentiellement manquantes</h3>
          <p className="text-sm text-muted-foreground">
            Basé sur {similarProjectsCount} inspections similaires complétées
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={detectMissingTasks}>
          Réanalyser
        </Button>
      </div>

      {missingTasks.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucune tâche manquante détectée. Votre inspection semble complète !
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {missingTasks.map((task, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {task.occurrence_rate}% des projets similaires
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Trouvée dans {task.found_in_projects} projets
                    </Badge>
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>DSC: {task.family.name} / {task.category.name} / {task.subcategory.name}</span>
                    {task.area && <span>• Zone: {task.area}</span>}
                    {task.location && <span>• Localisation: {task.location}</span>}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => addMissingTask(task, index)}
                  disabled={addingTaskId === `${index}-${task.title}`}
                  className="gap-2 shrink-0"
                >
                  {addingTaskId === `${index}-${task.title}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Ajouter
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}