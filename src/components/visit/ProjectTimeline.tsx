import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Video,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  ChevronDown,
  Building2,
  Home,
  Sparkles,
  FileText,
  Edit2,
  Mic,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ConditionBadge } from '@/components/visit/ConditionBadge';
import {
  TYPE_ZONE_LABELS,
  TypeZone,
  EtatGlobal,
  TypePartie,
} from '@/types/visitModel';
import { cn } from '@/lib/utils';

interface TimelineSequence {
  sequence_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  etat_detecte: EtatGlobal | null;
  etat_confirme: EtatGlobal | null;
  zones_detectees: TypeZone[];
  transcription: string | null;
  ordre_visite: number | null;
  nb_problemes: number;
  nb_taches: number;
  nb_medias: number;
  lieu_id: string;
  nom_lieu: string;
  type_lieu: string | null;
  partie_id: string;
  nom_partie: string;
  type_partie: TypePartie;
  bien_id: string;
  adresse: string;
}

interface Problem {
  id: string;
  title: string;
  severity: string;
  zone_type: TypeZone | null;
  origine: string;
}

interface Task {
  id: string;
  title: string;
  famille_nom: string | null;
  categorie_nom: string | null;
  sous_categorie_nom: string | null;
  etat_validation: string;
}

interface ProjectTimelineProps {
  projectId: string;
  onSequenceSelect?: (sequenceId: string) => void;
  onEditSequence?: (sequenceId: string) => void;
}

export const ProjectTimeline = ({
  projectId,
  onSequenceSelect,
  onEditSequence,
}: ProjectTimelineProps) => {
  const [sequences, setSequences] = useState<TimelineSequence[]>([]);
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(new Set());
  const [problemsBySequence, setProblemsBySequence] = useState<Record<string, Problem[]>>({});
  const [tasksBySequence, setTasksBySequence] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [projectId]);

  const loadTimeline = async () => {
    try {
      const { data: seqData } = await supabase
        .from('visit_sequences')
        .select(`
          id,
          started_at,
          ended_at,
          duration_seconds,
          status,
          detected_condition,
          user_condition,
          detected_zones,
          transcription,
          ordre_visite,
          property_locations(id, name, location_type),
          property_parts(id, name, part_type)
        `)
        .eq('project_id', projectId)
        .order('started_at', { ascending: false });

      const seqs = (seqData || []).map((s: any) => ({
        sequence_id: s.id,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_seconds: s.duration_seconds,
        status: s.status,
        etat_detecte: s.detected_condition,
        etat_confirme: s.user_condition,
        zones_detectees: s.detected_zones || [],
        transcription: s.transcription,
        ordre_visite: s.ordre_visite,
        nb_problemes: 0,
        nb_taches: 0,
        nb_medias: 0,
        lieu_id: s.property_locations?.id,
        nom_lieu: s.property_locations?.name || 'Lieu inconnu',
        type_lieu: s.property_locations?.location_type,
        partie_id: s.property_parts?.id,
        nom_partie: s.property_parts?.name || 'Partie inconnue',
        type_partie: s.property_parts?.part_type || 'commune',
        bien_id: projectId,
        adresse: '',
      }));

      setSequences(seqs);
      if (seqs.length > 0) setExpandedSequences(new Set([seqs[0].sequence_id]));

      // Load problems
      const sequenceIds = seqs.map((s: any) => s.sequence_id);
      if (sequenceIds.length > 0) {
        const { data: probData } = await supabase
          .from('identified_problems')
          .select('id, title, severity, zone_type, origine, sequence_id')
          .in('sequence_id', sequenceIds);

        const probMap: Record<string, Problem[]> = {};
        (probData || []).forEach((p: any) => {
          if (!probMap[p.sequence_id]) probMap[p.sequence_id] = [];
          probMap[p.sequence_id].push(p);
        });
        setProblemsBySequence(probMap);

        // Update sequence counts
        setSequences(prev => prev.map(seq => ({
          ...seq,
          nb_problemes: probMap[seq.sequence_id]?.length || 0,
        })));

        // Load tasks
        const problemIds = (probData || []).map((p: any) => p.id);
        if (problemIds.length > 0) {
          const { data: taskData } = await supabase
            .from('problem_tasks')
            .select(`
              id, title, etat_validation, problem_id,
              task_families(name),
              task_categories(name),
              task_subcategories(name)
            `)
            .in('problem_id', problemIds);

          const taskMap: Record<string, Task[]> = {};
          (taskData || []).forEach((t: any) => {
            const prob = (probData || []).find((p: any) => p.id === t.problem_id);
            if (prob) {
              const seqId = prob.sequence_id;
              if (!taskMap[seqId]) taskMap[seqId] = [];
              taskMap[seqId].push({
                ...t,
                famille_nom: t.task_families?.name,
                categorie_nom: t.task_categories?.name,
                sous_categorie_nom: t.task_subcategories?.name,
              });
            }
          });
          setTasksBySequence(taskMap);

          // Update sequence counts
          setSequences(prev => prev.map(seq => ({
            ...seq,
            nb_taches: taskMap[seq.sequence_id]?.length || 0,
          })));
        }
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSequence = (seqId: string) => {
    setExpandedSequences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seqId)) newSet.delete(seqId);
      else newSet.add(seqId);
      return newSet;
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 text-primary animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (sequences.length === 0) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Video className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Aucune séquence enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  const sequencesByDate = sequences.reduce((acc, seq) => {
    const date = formatDate(seq.started_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(seq);
    return acc;
  }, {} as Record<string, TimelineSequence[]>);

  return (
    <Card className="card-premium h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Timeline
          <Badge variant="secondary" className="ml-auto">{sequences.length}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-4 pt-0">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            {Object.entries(sequencesByDate).map(([date, daySeqs]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">{date}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-3 pl-2 border-l-2 border-border ml-4">
                  {daySeqs.map((seq, idx) => {
                    const isExpanded = expandedSequences.has(seq.sequence_id);
                    const etat = seq.etat_confirme || seq.etat_detecte;
                    const problems = problemsBySequence[seq.sequence_id] || [];
                    const tasks = tasksBySequence[seq.sequence_id] || [];

                    return (
                      <div key={seq.sequence_id} className="relative pl-6 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className={cn(
                          "absolute left-0 top-4 w-3 h-3 rounded-full -translate-x-[7px] ring-4 ring-background",
                          etat === 'neuf' ? 'bg-success' :
                          etat === 'bon' ? 'bg-info' :
                          etat === 'a_refaire' ? 'bg-destructive' : 'bg-muted-foreground'
                        )} />

                        <div className={cn("card-premium overflow-hidden", isExpanded && "ring-2 ring-primary/20")}>
                          <button onClick={() => toggleSequence(seq.sequence_id)} className="w-full p-4 text-left hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {seq.type_partie === 'commune' ? (
                                    <Building2 className="w-4 h-4 text-info" />
                                  ) : (
                                    <Home className="w-4 h-4 text-success" />
                                  )}
                                  <span className="font-semibold truncate">{seq.nom_lieu}</span>
                                  {etat && <ConditionBadge condition={etat} size="sm" />}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{seq.nom_partie}</span>
                                  <span>•</span>
                                  <span className="font-mono">{formatTime(seq.started_at)}</span>
                                  <span>•</span>
                                  <span className="font-mono">{formatDuration(seq.duration_seconds)}</span>
                                </div>

                                {seq.zones_detectees.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {seq.zones_detectees.slice(0, 4).map(zone => (
                                      <Badge key={zone} variant="outline" className="text-xs py-0">
                                        {TYPE_ZONE_LABELS[zone]}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center gap-1 text-warning">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium">{seq.nb_problemes}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-success">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="font-medium">{seq.nb_taches}</span>
                                  </div>
                                </div>
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border animate-slide-down">
                              {seq.transcription && (
                                <div className="p-4 bg-muted/20 border-b border-border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Mic className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-medium text-muted-foreground">Transcription</span>
                                  </div>
                                  <p className="text-sm leading-relaxed">"{seq.transcription}"</p>
                                </div>
                              )}

                              {problems.length > 0 && (
                                <div className="p-4 border-b border-border">
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-warning" />
                                    <span className="text-xs font-medium text-muted-foreground">Problèmes ({problems.length})</span>
                                  </div>
                                  <div className="space-y-2">
                                    {problems.map(prob => (
                                      <div key={prob.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                                        <div className={cn(
                                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                                          prob.severity === 'critical' ? 'bg-destructive' :
                                          prob.severity === 'high' ? 'bg-warning' : 'bg-muted-foreground'
                                        )} />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium">{prob.title}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            {prob.zone_type && (
                                              <Badge variant="outline" className="text-xs py-0">{TYPE_ZONE_LABELS[prob.zone_type]}</Badge>
                                            )}
                                            {prob.origine === 'ia' && (
                                              <Badge className="text-xs py-0 bg-primary">
                                                <Sparkles className="w-3 h-3 mr-1" />IA
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {tasks.length > 0 && (
                                <div className="p-4 border-b border-border">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-accent" />
                                    <span className="text-xs font-medium text-muted-foreground">Tâches FT/CT/ST ({tasks.length})</span>
                                  </div>
                                  <div className="space-y-2">
                                    {tasks.map(task => (
                                      <div key={task.id} className="p-2 bg-muted/30 rounded-lg">
                                        <p className="text-sm font-medium">{task.title}</p>
                                        {(task.famille_nom || task.categorie_nom) && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {[task.famille_nom, task.categorie_nom, task.sous_categorie_nom].filter(Boolean).join(' → ')}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="p-4 flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => onSequenceSelect?.(seq.sequence_id)}>
                                  <MapPin className="w-4 h-4 mr-2" />Voir détails
                                </Button>
                                <Button size="sm" className="flex-1" onClick={() => onEditSequence?.(seq.sequence_id)}>
                                  <Edit2 className="w-4 h-4 mr-2" />Corriger
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
