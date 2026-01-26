import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, Play, AlertTriangle, MapPin, FileText, 
  Brain, ChevronRight, Filter, Sparkles, CheckCircle2,
  ListTodo, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVisitSequences } from '@/hooks/useVisitSequences';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SequenceTimelineProps {
  projectId: string;
  sessionId?: string;
}

type SequenceFilter = 'all' | 'anomalies' | 'confirmed' | 'unconfirmed';

export const SequenceTimeline: React.FC<SequenceTimelineProps> = ({ projectId, sessionId }) => {
  const { sequences, problems, tasks, loading } = useVisitSequences(projectId);
  const [activeFilter, setActiveFilter] = useState<SequenceFilter>('all');
  const [selectedSequence, setSelectedSequence] = useState<any | null>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const { selectionChanged } = useHapticFeedback();

  useEffect(() => {
    loadAnomalies();
  }, [projectId]);

  const loadAnomalies = async () => {
    const { data } = await supabase
      .from('detected_anomalies')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (data) setAnomalies(data);
  };

  const filteredSequences = useMemo(() => {
    switch (activeFilter) {
      case 'anomalies':
        return sequences.filter(seq => anomalies.some(a => a.visit_session_id === sessionId));
      case 'confirmed':
        return sequences.filter(seq => seq.status === 'completed');
      case 'unconfirmed':
        return sequences.filter(seq => seq.status !== 'completed');
      default:
        return sequences;
    }
  }, [sequences, activeFilter, anomalies, sessionId]);

  const getSequenceProblems = (sequenceId: string) => problems.filter(p => p.sequence_id === sequenceId);
  const getSequenceTasks = (sequenceId: string) => {
    const seqProblems = getSequenceProblems(sequenceId);
    return tasks.filter(t => seqProblems.some(p => p.id === t.problem_id));
  };

  const getConditionColor = (condition: string | null) => {
    switch (condition) {
      case 'Neuf': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'Bon': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'À refaire': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filterButtons = [
    { value: 'all' as SequenceFilter, label: 'Toutes', count: sequences.length },
    { value: 'anomalies' as SequenceFilter, label: 'Anomalies', count: anomalies.length, icon: <AlertTriangle className="h-4 w-4" /> },
    { value: 'confirmed' as SequenceFilter, label: 'Confirmées', count: sequences.filter(s => s.status === 'completed').length },
    { value: 'unconfirmed' as SequenceFilter, label: 'En cours', count: sequences.filter(s => s.status !== 'completed').length },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 p-3">
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-1">
            {filterButtons.map(({ value, label, count, icon }) => (
              <Button
                key={value}
                variant={activeFilter === value ? 'default' : 'outline'}
                size="sm"
                className={cn("rounded-full gap-2 shrink-0", activeFilter === value && "shadow-md")}
                onClick={() => { setActiveFilter(value); selectionChanged(); }}
              >
                {icon}
                {label}
                <Badge variant="secondary" className={cn("ml-1 h-5 min-w-5 rounded-full text-xs", activeFilter === value && "bg-primary-foreground/20 text-primary-foreground")}>
                  {count}
                </Badge>
              </Button>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-3 mt-3">
          <Card className="flex-1 p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Séquences</p><p className="font-semibold">{sequences.length}</p></div>
            </div>
          </Card>
          <Card className="flex-1 p-3 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
              <div><p className="text-xs text-muted-foreground">Anomalies</p><p className="font-semibold">{anomalies.length}</p></div>
            </div>
          </Card>
          <Card className="flex-1 p-3 bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10"><ListTodo className="h-4 w-4 text-emerald-600" /></div>
              <div><p className="text-xs text-muted-foreground">Tâches</p><p className="font-semibold">{tasks.length}</p></div>
            </div>
          </Card>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : filteredSequences.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Aucune séquence</p>
            <p className="text-sm">Commencez un reportage pour créer des séquences</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {filteredSequences.map((sequence) => {
                const seqProblems = getSequenceProblems(sequence.id);
                const seqTasks = getSequenceTasks(sequence.id);
                return (
                  <div key={sequence.id} className="relative pl-14">
                    <div className={cn(
                      "absolute left-4 top-4 h-5 w-5 rounded-full border-4 border-background z-10",
                      sequence.status === 'completed' ? 'bg-emerald-500' : sequence.status === 'processing' ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground'
                    )} />
                    <Card 
                      className={cn("rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]")}
                      onClick={() => { setSelectedSequence(sequence); selectionChanged(); }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs border", getConditionColor(sequence.user_condition || sequence.detected_condition || null))}>
                                {sequence.user_condition || sequence.detected_condition || 'Non évalué'}
                              </Badge>
                            </div>
                            <h4 className="font-semibold mt-2 truncate">
                              {sequence.transcription?.slice(0, 50) || 'Séquence de visite'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">{sequence.detected_zones?.join(', ') || 'Localisation non définie'}</span>
                            </div>
                            {sequence.transcription && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">"{sequence.transcription}"</p>
                            )}
                            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDistanceToNow(new Date(sequence.created_at), { addSuffix: true, locale: fr })}
                              </span>
                              {seqProblems.length > 0 && (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <AlertTriangle className="h-3.5 w-3.5" />{seqProblems.length} problème{seqProblems.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {seqTasks.length > 0 && (
                                <span className="flex items-center gap-1 text-primary">
                                  <ListTodo className="h-3.5 w-3.5" />{seqTasks.length} tâche{seqTasks.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {sequence.video_url ? (
                              <div className="relative h-16 w-24 rounded-xl overflow-hidden bg-muted">
                                <img src={sequence.video_url} alt="" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Play className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-16 w-24 rounded-xl bg-muted flex items-center justify-center">
                                <FileText className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                            )}
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      <Dialog open={!!selectedSequence} onOpenChange={() => setSelectedSequence(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Détail de la séquence</DialogTitle>
          </DialogHeader>
          {selectedSequence && (
            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Vue</TabsTrigger>
                <TabsTrigger value="transcription">Transcription</TabsTrigger>
                <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
                <TabsTrigger value="tasks">Tâches</TabsTrigger>
              </TabsList>
              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="m-0">
                  <div className="space-y-4">
                    {selectedSequence.video_url && <video src={selectedSequence.video_url} controls className="w-full rounded-xl" />}
                    <Card className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-muted-foreground">Transcription</p><p className="font-medium line-clamp-1">{selectedSequence.transcription?.slice(0, 50) || '—'}</p></div>
                        <div><p className="text-muted-foreground">Zones détectées</p><p className="font-medium">{selectedSequence.detected_zones?.join(', ') || '—'}</p></div>
                        <div><p className="text-muted-foreground">État</p><Badge className={cn("mt-1", getConditionColor(selectedSequence.user_condition))}>{selectedSequence.user_condition || 'Non évalué'}</Badge></div>
                        <div><p className="text-muted-foreground">Date</p><p className="font-medium">{format(new Date(selectedSequence.created_at), 'PPp', { locale: fr })}</p></div>
                      </div>
                    </Card>
                    <Button className="w-full gap-2" size="lg"><Sparkles className="h-4 w-4" />Analyser avec l'IA</Button>
                  </div>
                </TabsContent>
                <TabsContent value="transcription" className="m-0">
                  <Card className="p-4">
                    {selectedSequence.transcription ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedSequence.transcription}</p>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>Aucune transcription</p></div>
                    )}
                  </Card>
                </TabsContent>
                <TabsContent value="anomalies" className="m-0">
                  <div className="space-y-3">
                    {getSequenceProblems(selectedSequence.id).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" /><p>Aucune anomalie</p></div>
                    ) : (
                      getSequenceProblems(selectedSequence.id).map(problem => (
                        <Card key={problem.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
                            <div className="flex-1">
                              <p className="font-medium">{problem.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{problem.description}</p>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="tasks" className="m-0">
                  <div className="space-y-3">
                    {getSequenceTasks(selectedSequence.id).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>Aucune tâche</p>
                        <Button variant="outline" className="mt-4 gap-2"><Zap className="h-4 w-4" />Générer des tâches</Button>
                      </div>
                    ) : (
                      getSequenceTasks(selectedSequence.id).map(task => (
                        <Card key={task.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10"><ListTodo className="h-4 w-4 text-primary" /></div>
                            <div className="flex-1">
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
