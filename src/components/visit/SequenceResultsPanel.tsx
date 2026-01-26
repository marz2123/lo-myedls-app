import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Plus,
  Trash2,
  Save,
  X,
  Loader2,
  Sparkles,
  Camera,
  Mic,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConditionBadge } from '@/components/visit/ConditionBadge';
import {
  CONDITION_STATE_LABELS,
  ZONE_TYPE_LABELS,
  SEVERITY_LABELS,
  type ConditionState,
  type VisitSequence,
  type IdentifiedProblem,
  type ProblemTask,
} from '@/types/businessModel';
import { cn } from '@/lib/utils';

interface SequenceResultsPanelProps {
  sequenceId: string;
  projectId: string;
  onClose?: () => void;
}

export const SequenceResultsPanel = ({
  sequenceId,
  projectId,
  onClose,
}: SequenceResultsPanelProps) => {
  const [sequence, setSequence] = useState<VisitSequence | null>(null);
  const [problems, setProblems] = useState<IdentifiedProblem[]>([]);
  const [tasks, setTasks] = useState<ProblemTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCondition, setEditingCondition] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<ConditionState>('bon');
  const [addingProblem, setAddingProblem] = useState(false);
  const [newProblemTitle, setNewProblemTitle] = useState('');
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [sequenceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: seqData } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('id', sequenceId)
        .single();
      
      if (seqData) {
        setSequence(seqData as VisitSequence);
        setSelectedCondition(seqData.user_condition || seqData.detected_condition || 'bon');
      }

      const { data: probData } = await supabase
        .from('identified_problems')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('created_at');
      
      setProblems((probData || []) as IdentifiedProblem[]);
      // Auto-expand all problems
      setExpandedProblems(new Set((probData || []).map(p => p.id)));

      if (probData && probData.length > 0) {
        const problemIds = probData.map(p => p.id);
        const [{ data: taskData }, ftRes, ctRes, scRes] = await Promise.all([
          supabase
            .from('problem_tasks')
            .select('*')
            .in('problem_id', problemIds)
            .order('created_at'),
          supabase.from('ft_familles').select('id, ft_label'),
          supabase.from('ct_categories').select('id, ct_label'),
          supabase.from('sc_sous_categories').select('id, sc_label'),
        ]);

        const ftMap = new Map(ftRes.data?.map(ft => [ft.id, ft]) || []);
        const ctMap = new Map(ctRes.data?.map(ct => [ct.id, ct]) || []);
        const scMap = new Map(scRes.data?.map(sc => [sc.id, sc]) || []);

        const tasksWithNames = (taskData || []).map((t: any) => ({
          ...t,
          family_name: t.family_id ? ftMap.get(t.family_id)?.ft_label : undefined,
          category_name: t.category_id ? ctMap.get(t.category_id)?.ct_label : undefined,
          subcategory_name: t.subcategory_id ? scMap.get(t.subcategory_id)?.sc_label : undefined,
        }));
        
        setTasks(tasksWithNames as ProblemTask[]);
      }

    } catch (error) {
      console.error('Error loading sequence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCondition = async () => {
    if (!sequence) return;
    
    try {
      await supabase
        .from('visit_sequences')
        .update({ user_condition: selectedCondition })
        .eq('id', sequenceId);
      
      setSequence({ ...sequence, user_condition: selectedCondition });
      setEditingCondition(false);
      toast.success('État mis à jour');
    } catch (error) {
      console.error('Error saving condition:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const addProblem = async () => {
    if (!newProblemTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('identified_problems')
        .insert({
          sequence_id: sequenceId,
          project_id: projectId,
          location_id: sequence?.location_id,
          title: newProblemTitle,
          severity: 'medium',
          ai_detected: false,
          is_confirmed: true,
          photo_urls: [],
        })
        .select()
        .single();

      if (error) throw error;
      setProblems([...problems, data as IdentifiedProblem]);
      setExpandedProblems(prev => new Set([...prev, data.id]));
      setNewProblemTitle('');
      setAddingProblem(false);
      toast.success('Problème ajouté');
    } catch (error) {
      console.error('Error adding problem:', error);
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const deleteProblem = async (problemId: string) => {
    try {
      await supabase
        .from('identified_problems')
        .delete()
        .eq('id', problemId);
      
      setProblems(problems.filter(p => p.id !== problemId));
      setTasks(tasks.filter(t => t.problem_id !== problemId));
      toast.success('Problème supprimé');
    } catch (error) {
      console.error('Error deleting problem:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleProblem = (problemId: string) => {
    setExpandedProblems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(problemId)) {
        newSet.delete(problemId);
      } else {
        newSet.add(problemId);
      }
      return newSet;
    });
  };

  const getTasksForProblem = (problemId: string) => {
    return tasks.filter(t => t.problem_id === problemId);
  };

  const condition = sequence?.user_condition || sequence?.detected_condition;

  if (loading) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chargement des résultats...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sequence) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Séquence non trouvée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Résultats de l'analyse
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-4 pt-0">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            {/* Condition State */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">État général</span>
                {!editingCondition ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCondition(true)}
                    className="text-muted-foreground"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveCondition}>
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Enregistrer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCondition(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                )}
              </div>

              {editingCondition ? (
                <Select
                  value={selectedCondition}
                  onValueChange={(v) => setSelectedCondition(v as ConditionState)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CONDITION_STATE_LABELS) as [ConditionState, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <ConditionBadge condition={value} size="sm" />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                condition && (
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                    <ConditionBadge condition={condition} size="lg" />
                    {sequence.detected_condition !== sequence.user_condition && sequence.user_condition && (
                      <Badge variant="outline" className="text-xs">Modifié</Badge>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Detected Zones */}
            {sequence.detected_zones && sequence.detected_zones.length > 0 && (
              <div className="space-y-3">
                <span className="text-sm font-medium">Zones détectées</span>
                <div className="flex flex-wrap gap-2">
                  {sequence.detected_zones.map((zone) => (
                    <Badge key={zone} variant="secondary" className="py-1.5">
                      {ZONE_TYPE_LABELS[zone]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Transcription */}
            {sequence.transcription && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Transcription</span>
                </div>
                <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl leading-relaxed">
                  "{sequence.transcription}"
                </p>
              </div>
            )}

            {/* Photos */}
            {sequence.photos && sequence.photos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Photos ({sequence.photos.length})</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {sequence.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="aspect-square object-cover rounded-xl ring-1 ring-border"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Problems */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">
                    Problèmes identifiés ({problems.length})
                  </span>
                </div>
                {!addingProblem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddingProblem(true)}
                    className="text-muted-foreground"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Ajouter
                  </Button>
                )}
              </div>

              {/* Add Problem Form */}
              {addingProblem && (
                <div className="p-4 bg-muted/30 rounded-xl space-y-3 animate-scale-in">
                  <Input
                    placeholder="Description du problème"
                    value={newProblemTitle}
                    onChange={(e) => setNewProblemTitle(e.target.value)}
                    className="h-11"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={addProblem} className="flex-1" disabled={!newProblemTitle.trim()}>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Ajouter
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setAddingProblem(false);
                        setNewProblemTitle('');
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}

              {/* Problems List */}
              {problems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  </div>
                  <p className="text-sm text-muted-foreground">Aucun problème identifié</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {problems.map((problem, idx) => {
                    const problemTasks = getTasksForProblem(problem.id);
                    const isExpanded = expandedProblems.has(problem.id);
                    
                    return (
                      <div
                        key={problem.id}
                        className="rounded-xl border border-border overflow-hidden animate-fade-in"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <button
                          onClick={() => toggleProblem(problem.id)}
                          className="w-full p-4 bg-muted/30 flex items-start justify-between hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-3 text-left">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                              problem.severity === 'critical' ? "bg-destructive/10" :
                              problem.severity === 'high' ? "bg-warning/10" : "bg-muted"
                            )}>
                              <AlertTriangle className={cn(
                                "w-4 h-4",
                                problem.severity === 'critical' ? "text-destructive" :
                                problem.severity === 'high' ? "text-warning" : "text-muted-foreground"
                              )} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{problem.title}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {SEVERITY_LABELS[problem.severity as keyof typeof SEVERITY_LABELS] || problem.severity}
                                </Badge>
                                {problem.zone_type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {ZONE_TYPE_LABELS[problem.zone_type]}
                                  </Badge>
                                )}
                                {problem.ai_detected && (
                                  <Badge className="text-xs bg-primary">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {problemTasks.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {problemTasks.length} tâche{problemTasks.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProblem(problem.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Tasks for this problem */}
                        {isExpanded && problemTasks.length > 0 && (
                          <div className="p-4 space-y-2 bg-card">
                            <span className="text-xs text-muted-foreground font-medium">
                              Tâches associées
                            </span>
                            {problemTasks.map((task) => (
                              <div
                                key={task.id}
                                className="p-3 bg-muted/20 rounded-lg"
                              >
                                <p className="font-medium text-sm">{task.title}</p>
                                {(task.family_name || task.category_name) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {[task.family_name, task.category_name, task.subcategory_name]
                                      .filter(Boolean)
                                      .join(' / ')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
