import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  X, Video, FlaskConical, ChevronRight, Layers, CheckCircle, 
  Clock, AlertTriangle, Sparkles, Play, Send, Loader2, Trash2,
  MapPin, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SequencesModuleProps {
  projectId: string;
  projectName?: string;
  onClose?: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  location: string | null;
  source_type: string | null;
  visit_sequence_id: string | null;
  created_at: string;
}

interface Sequence {
  id: string;
  status: string | null;
  metadata: any;
  photos: string[] | null;
  video_url: string | null;
  transcription: string | null;
  created_at: string;
}

const SequencesModule = ({ projectId, projectName = "Projet", onClose }: SequencesModuleProps) => {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState<string | null>(null);
  const [showLabPanel, setShowLabPanel] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Charger les séquences
      const { data: seqData, error: seqError } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (seqError) throw seqError;
      setSequences(seqData || []);

      // Charger les tâches (sans JOIN - les FK ont été supprimées)
      const { data: tasksData, error: tasksError } = await supabase
        .from('extracted_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const extractTasksFromSequence = async (sequenceId: string) => {
    setIsExtracting(sequenceId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      // Récupérer la séquence
      const sequence = sequences.find(s => s.id === sequenceId);
      if (!sequence) return;

      // Appeler l'Edge Function edl-ai-pipeline pour extraction
      const { data, error } = await supabase.functions.invoke('edl-ai-pipeline', {
        body: {
          step: 'extract',
          projectContext: {
            projectId,
            sequenceId,
          },
          globalTranscript: sequence.transcription || '',
          photoUrls: sequence.photos || [],
          captureMode: sequence.video_url ? 'video' : 'photo_voice',
        },
      });

      if (error) throw error;

      // Sauvegarder les tâches extraites
      const extractedTasks = data?.extractedTasks || [];
      
      if (extractedTasks.length > 0) {
        for (const task of extractedTasks) {
          await supabase.from('extracted_tasks').insert({
            project_id: projectId,
            user_id: user.id,
            visit_sequence_id: sequenceId,
            title: task.title,
            description: task.description,
            location: task.location,
            priority: task.priority || 'medium',
            source_type: 'sequence',
            family_id: task.familyId || null,
            category_id: task.categoryId || null,
            subcategory_id: task.subcategoryId || null,
            task_id: task.taskId || null,
            status: 'pending',
          });
        }

        await loadData();
        toast.success(`${extractedTasks.length} tâches extraites avec succès`);
      } else {
        toast.info("Aucune tâche détectée dans cette séquence");
      }
    } catch (error: any) {
      console.error('Error extracting tasks:', error);
      toast.error(error.message || "Erreur lors de l'extraction");
    } finally {
      setIsExtracting(null);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await supabase.from('extracted_tasks').update({ status }).eq('id', taskId);
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
      toast.success("Statut mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    try {
      await supabase.from('extracted_tasks').delete().eq('id', taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success("Tâche supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Statistiques
  const stats = {
    sequences: sequences.length,
    tasks: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed' || t.status === 'validated').length,
    classified: tasks.length > 0 
      ? Math.round((tasks.filter(t => t.status === 'completed' || t.status === 'validated').length / tasks.length) * 100) 
      : 0
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSequenceTaskCount = (sequenceId: string) => {
    return tasks.filter(t => t.visit_sequence_id === sequenceId).length;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Séquences & Tâches</h2>
              <p className="text-muted-foreground text-sm">{projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadData} title="Actualiser">
              <RefreshCw className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{stats.sequences} séq.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{stats.tasks} tâches</span>
          </div>
          <Badge variant="outline">{stats.classified}% classifié</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Lab IA Section */}
            <div className="border-b">
              <button 
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => setShowLabPanel(!showLabPanel)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Lab IA</span>
                      <Badge variant="secondary" className="text-xs">
                        {sequences.length}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Extrayez les tâches des séquences
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showLabPanel ? 'rotate-90' : ''}`} />
              </button>

              {showLabPanel && (
                <div className="px-4 pb-4 space-y-3">
                  {sequences.length > 0 ? (
                    sequences.map(seq => {
                      const taskCount = getSequenceTaskCount(seq.id);
                      const location = seq.metadata?.endroitName || seq.metadata?.lieuName || 'Lieu non défini';
                      
                      return (
                        <Card key={seq.id}>
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm font-medium truncate">{location}</span>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                  {new Date(seq.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                  {taskCount > 0 && ` • ${taskCount} tâche(s)`}
                                </p>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => extractTasksFromSequence(seq.id)}
                                disabled={isExtracting === seq.id}
                                className="gap-2 ml-2"
                              >
                                {isExtracting === seq.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4" />
                                )}
                                Extraire
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Aucune séquence à analyser
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tasks List */}
            <div className="px-4 py-4">
              <h3 className="font-medium mb-3">
                Tâches extraites ({tasks.length})
              </h3>
              
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <Card key={task.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button 
                              onClick={() => updateTaskStatus(
                                task.id, 
                                task.status === 'completed' ? 'pending' : 'completed'
                              )}
                              className="flex-shrink-0"
                            >
                              {task.status === 'completed' || task.status === 'validated' ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-yellow-500" />
                              )}
                            </button>
                            <span className={`text-sm font-medium truncate ${
                              task.status === 'completed' ? 'line-through opacity-50' : ''
                            }`}>
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority || 'medium'}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteTask(task.id)}
                              className="h-6 w-6 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {task.location && (
                          <p className="text-muted-foreground text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {task.location}
                          </p>
                        )}
                        
                        {task.description && (
                          <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    Aucune tâche. Utilisez le Lab IA pour en extraire depuis vos séquences.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SequencesModule;
