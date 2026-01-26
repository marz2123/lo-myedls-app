import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, Mic, MicOff, Sparkles, Plus, Save, Clock, 
  AlertTriangle, Wand2, RefreshCw, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Note {
  id: string;
  content: string;
  type: 'observation' | 'anomaly' | 'log' | 'ai_summary';
  createdAt: Date;
  updatedAt: Date;
}

interface ReportageEditorProps {
  projectId: string;
  sessionId?: string;
}

export const ReportageEditor: React.FC<ReportageEditorProps> = ({ projectId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const { trigger, selectionChanged } = useHapticFeedback();

  useEffect(() => { loadNotes(); }, [projectId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const allNotes: Note[] = [];
      const { data: logs } = await supabase.from('daily_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (logs) {
        logs.forEach(log => {
          if (log.observations) allNotes.push({ id: `log-obs-${log.id}`, content: log.observations, type: 'observation', createdAt: new Date(log.created_at), updatedAt: new Date(log.updated_at) });
          if (log.problems_encountered) allNotes.push({ id: `log-prob-${log.id}`, content: log.problems_encountered, type: 'anomaly', createdAt: new Date(log.created_at), updatedAt: new Date(log.updated_at) });
          if (log.ai_summary) allNotes.push({ id: `log-ai-${log.id}`, content: log.ai_summary, type: 'ai_summary', createdAt: new Date(log.created_at), updatedAt: new Date(log.updated_at) });
        });
      }
      const { data: sequences } = await supabase.from('visit_sequences').select('id, transcription, created_at').eq('project_id', projectId).not('transcription', 'is', null);
      if (sequences) {
        sequences.forEach(seq => {
          if (seq.transcription) allNotes.push({ id: `seq-trans-${seq.id}`, content: seq.transcription, type: 'log', createdAt: new Date(seq.created_at), updatedAt: new Date(seq.created_at) });
        });
      }
      allNotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNotes(allNotes);
    } catch (error) { console.error('Error loading notes:', error); }
    finally { setLoading(false); }
  };

  const toggleExpand = (noteId: string) => {
    setExpandedNotes(prev => { const n = new Set(prev); n.has(noteId) ? n.delete(noteId) : n.add(noteId); return n; });
    selectionChanged();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    trigger('zone_complete');
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('daily_logs').insert({ project_id: projectId, user_id: user.id, observations: newNote, log_date: new Date().toISOString().split('T')[0] });
      if (error) throw error;
      setNewNote('');
      await loadNotes();
      toast.success('Note ajoutée');
    } catch (error) { console.error('Error:', error); toast.error('Erreur'); }
    finally { setIsProcessing(false); }
  };

  const handleVoiceRecord = async () => {
    trigger('recording_start');
    setIsRecording(!isRecording);
    if (!isRecording) { toast.info('Enregistrement vocal...'); }
    else { setIsProcessing(true); toast.info('Transcription...'); setTimeout(() => { setNewNote(prev => prev + ' [Transcription simulée]'); setIsProcessing(false); }, 2000); }
  };

  const handleAIAssist = async (action: 'summarize' | 'reformat' | 'extract' | 'generate') => {
    trigger('zone_complete');
    setIsProcessing(true);
    toast.info('Traitement IA...');
    try {
      const { data, error } = await supabase.functions.invoke('myaladin-chat', {
        body: { message: action === 'summarize' ? `Résume: ${notes.map(n => n.content).join('\n')}` : action === 'reformat' ? `Reformule: ${newNote}` : action === 'extract' ? `Extrais tâches: ${notes.map(n => n.content).join('\n')}` : `Génère EDL: ${notes.map(n => n.content).join('\n')}`, context_type: 'reportage', context_data: { projectId } }
      });
      if (error) throw error;
      if (data?.response) {
        if (action === 'summarize' || action === 'generate') setNotes(prev => [{ id: `ai-${Date.now()}`, content: data.response, type: 'ai_summary', createdAt: new Date(), updatedAt: new Date() }, ...prev]);
        else setNewNote(data.response);
        toast.success('IA terminé');
      }
    } catch (error) { console.error(error); toast.error('Erreur IA'); }
    finally { setIsProcessing(false); }
  };

  const getNoteIcon = (type: Note['type']) => {
    switch (type) { case 'observation': return <FileText className="h-4 w-4" />; case 'anomaly': return <AlertTriangle className="h-4 w-4" />; case 'log': return <Clock className="h-4 w-4" />; case 'ai_summary': return <Sparkles className="h-4 w-4" />; }
  };
  const getNoteColor = (type: Note['type']) => {
    switch (type) { case 'observation': return 'bg-blue-500/10 text-blue-600'; case 'anomaly': return 'bg-amber-500/10 text-amber-600'; case 'log': return 'bg-slate-500/10 text-slate-600'; case 'ai_summary': return 'bg-purple-500/10 text-purple-600'; }
  };
  const getNoteLabel = (type: Note['type']) => {
    switch (type) { case 'observation': return 'Observation'; case 'anomaly': return 'Anomalie'; case 'log': return 'Journal'; case 'ai_summary': return 'Résumé IA'; }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 p-3">
        <Card className="p-3">
          <Textarea placeholder="Ajouter une note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-24 resize-none border-0 focus-visible:ring-0 p-0 text-sm" />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex gap-2">
              <Button variant={isRecording ? 'destructive' : 'outline'} size="sm" className="rounded-full gap-2" onClick={handleVoiceRecord} disabled={isProcessing}>
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{isRecording ? 'Arrêter' : 'Dicter'}
              </Button>
              <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => handleAIAssist('reformat')} disabled={isProcessing || !newNote.trim()}>
                <Wand2 className="h-4 w-4" />Reformuler
              </Button>
            </div>
            <Button size="sm" className="rounded-full gap-2" onClick={handleAddNote} disabled={isProcessing || !newNote.trim()}>
              {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Ajouter
            </Button>
          </div>
        </Card>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="flex-1 rounded-full gap-2" onClick={() => handleAIAssist('summarize')} disabled={isProcessing || notes.length === 0}><Sparkles className="h-4 w-4" />Résumer</Button>
          <Button variant="outline" size="sm" className="flex-1 rounded-full gap-2" onClick={() => handleAIAssist('extract')} disabled={isProcessing || notes.length === 0}><BookOpen className="h-4 w-4" />Extraire</Button>
          <Button variant="outline" size="sm" className="flex-1 rounded-full gap-2" onClick={() => handleAIAssist('generate')} disabled={isProcessing || notes.length === 0}><FileText className="h-4 w-4" />Générer EDL</Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground"><FileText className="h-12 w-12 mb-4 opacity-30" /><p className="text-lg font-medium">Aucune note</p></div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const isExpanded = expandedNotes.has(note.id);
              const isLong = note.content.length > 200;
              return (
                <Card key={note.id} className="rounded-2xl overflow-hidden hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-xl shrink-0", getNoteColor(note.type))}>{getNoteIcon(note.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={cn("text-xs", getNoteColor(note.type))}>{getNoteLabel(note.type)}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(note.createdAt, { addSuffix: true, locale: fr })}</span>
                        </div>
                        <p className={cn("text-sm leading-relaxed whitespace-pre-wrap", !isExpanded && isLong && "line-clamp-3")}>{note.content}</p>
                        {isLong && (
                          <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs text-muted-foreground" onClick={() => toggleExpand(note.id)}>
                            {isExpanded ? <><ChevronUp className="h-3 w-3 mr-1" />Réduire</> : <><ChevronDown className="h-3 w-3 mr-1" />Voir plus</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><FileText className="h-4 w-4" />{notes.filter(n => n.type === 'observation').length} observations</span>
            <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{notes.filter(n => n.type === 'anomaly').length} anomalies</span>
          </div>
          <span className="flex items-center gap-1"><Save className="h-4 w-4" />Sauvegardé</span>
        </div>
      </div>
    </div>
  );
};
