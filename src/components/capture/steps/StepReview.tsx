import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft,
  Save,
  FileText,
  ListTodo,
  MapPin,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  FileEdit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CaptureData, ExtractedTask, EdlSummary } from '../CaptureWizard';

interface StepReviewProps {
  captureData: CaptureData;
  updateCaptureData: (updates: Partial<CaptureData>) => void;
  onComplete: () => void;
  onBack: () => void;
}

type EdlStatus = 'validé' | 'brouillon';

export const StepReview = ({
  captureData,
  updateCaptureData,
  onComplete,
  onBack,
}: StepReviewProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<ExtractedTask | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location: '',
    priority: 'normale' as string,
    observations: ''
  });

  const { extractedTasks, edlSummary, transcript } = captureData;

  // Group tasks by pieceOrZone first, then by familyCode
  const tasksByLocation = extractedTasks.reduce((acc, task) => {
    const location = task.location || 'Non localisé';
    if (!acc[location]) {
      acc[location] = {};
    }
    const family = task.familyName || 'Non classifié';
    if (!acc[location][family]) {
      acc[location][family] = [];
    }
    acc[location][family].push(task);
    return acc;
  }, {} as Record<string, Record<string, ExtractedTask[]>>);

  const getStateEmoji = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'bon':
      case 'bon état':
      case 'very_good':
      case 'good':
        return '✅';
      case 'moyen':
      case 'état moyen':
      case 'medium':
        return '⚠️';
      case 'mauvais':
      case 'à rénover':
      case 'bad':
        return '❌';
      default:
        return '📋';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-destructive text-destructive-foreground';
      case 'haute': return 'bg-orange-500 text-white';
      case 'normale': return 'bg-primary text-primary-foreground';
      case 'basse': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleOpenEdit = (task: ExtractedTask) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      location: task.location || '',
      priority: task.priority || 'normale',
      observations: task.observations || ''
    });
  };

  const handleSaveEdit = () => {
    if (!editingTask) return;
    
    const validPriority = editForm.priority as 'basse' | 'normale' | 'haute' | 'urgente';
    
    const newTasks = extractedTasks.map(t => 
      t.id === editingTask.id 
        ? { 
            ...t, 
            title: editForm.title,
            description: editForm.description,
            location: editForm.location,
            priority: validPriority,
            observations: editForm.observations
          } 
        : t
    );
    updateCaptureData({ extractedTasks: newTasks });
    setEditingTask(null);
    toast.success('Tâche mise à jour');
  };

  const handleDeleteTask = (taskId: string) => {
    const newTasks = extractedTasks.filter(t => t.id !== taskId);
    updateCaptureData({ extractedTasks: newTasks });
    setEditingTask(null);
    toast.success('Tâche supprimée');
  };

  const handleSave = async (status: EdlStatus) => {
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Save tasks to database
      const tasksToInsert = extractedTasks.map(task => ({
        project_id: captureData.projectId,
        user_id: user.id,
        title: task.title,
        description: task.description,
        location: task.location,
        area: task.zone,
        priority: task.priority,
        detection_confidence: task.confidence,
        source_type: captureData.captureMode === 'video_walkthrough' ? 'video' : 'photo',
        analysis_metadata: JSON.parse(JSON.stringify({
          familyCode: task.familyCode,
          familyName: task.familyName,
          category: task.category,
          subCategory: task.subCategory,
          observations: task.observations || null,
          edlType: captureData.edlType,
          edlStatus: status,
          edlNotes: captureData.notes,
          rawTranscript: transcript,
          structuredSummary: edlSummary
        }))
      }));

      const { error: tasksError } = await supabase
        .from('extracted_tasks')
        .insert(tasksToInsert);

      if (tasksError) throw tasksError;

      const statusMessage = status === 'validé' 
        ? 'EDL validé et enregistré !' 
        : 'Brouillon enregistré';
      
      toast.success(statusMessage);
      onComplete();
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Révision & Validation</h2>
          <Badge variant="outline" className="shrink-0">
            <Sparkles className="h-3 w-3 mr-1" />
            {extractedTasks.length} tâches
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          L'IA a fait le travail, mais c'est toi qui valides.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* EDL Summary Section */}
          <section>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Synthèse de l'EDL
            </h3>

            {/* Resume Global */}
            {edlSummary?.resumeGlobal && (
              <Card className="p-4 mb-4 bg-muted/30">
                <p className="text-sm leading-relaxed">{edlSummary.resumeGlobal}</p>
              </Card>
            )}

            {/* Par Pieces Accordion */}
            {edlSummary?.parPieces && edlSummary.parPieces.length > 0 && (
              <Accordion type="single" collapsible className="space-y-2">
                {edlSummary.parPieces.map((piece, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`piece-${index}`} 
                    className="border rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="hover:no-underline px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getStateEmoji(piece.etatGeneral)}</span>
                        <span className="font-medium">{piece.piece}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">État général</p>
                          <Badge variant="outline">{piece.etatGeneral}</Badge>
                        </div>
                        
                        {piece.pointsForts && piece.pointsForts.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1 flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3 text-green-600" />
                              Points forts
                            </p>
                            <ul className="text-sm space-y-1">
                              {piece.pointsForts.map((point, i) => (
                                <li key={i} className="text-green-700">• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {piece.pointsFaibles && piece.pointsFaibles.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1 flex items-center gap-1">
                              <ThumbsDown className="h-3 w-3 text-orange-600" />
                              Points faibles
                            </p>
                            <ul className="text-sm space-y-1">
                              {piece.pointsFaibles.map((point, i) => (
                                <li key={i} className="text-orange-700">• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {!edlSummary?.resumeGlobal && (!edlSummary?.parPieces || edlSummary.parPieces.length === 0) && (
              <Card className="p-6 text-center text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune synthèse disponible</p>
              </Card>
            )}
          </section>

          {/* Tasks Section */}
          <section>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Tâches générées
            </h3>

            {Object.keys(tasksByLocation).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(tasksByLocation).map(([location, familyGroups]) => (
                  <Card key={location} className="overflow-hidden">
                    {/* Location Header */}
                    <div className="p-3 bg-primary/10 border-b flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">{location}</h4>
                    </div>

                    {/* Family Groups */}
                    {Object.entries(familyGroups).map(([family, tasks]) => (
                      <div key={family}>
                        <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">{family}</span>
                          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
                        </div>

                        <div className="divide-y">
                          {tasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => handleOpenEdit(task)}
                              className="w-full p-4 text-left hover:bg-muted/30 transition-colors active:bg-muted/50"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium">{task.title}</p>
                                  
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {task.familyCode && (
                                      <Badge variant="outline" className="text-xs">
                                        {task.familyCode} · {task.familyName}
                                      </Badge>
                                    )}
                                    <Badge className={cn("text-xs", getPriorityColor(task.priority || 'normale'))}>
                                      {task.priority || 'normale'}
                                    </Badge>
                                  </div>
                                  
                                  {task.observations && (
                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                                      💬 {task.observations}
                                    </p>
                                  )}
                                </div>
                                
                                <Edit2 className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune tâche extraite</p>
              </Card>
            )}
          </section>
        </div>
      </ScrollArea>

      {/* Bottom actions */}
      <div className="p-4 border-t bg-background safe-area-bottom space-y-3">
        <Button 
          className="w-full h-14 text-lg font-semibold"
          onClick={() => handleSave('validé')}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Save className="mr-2 h-5 w-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Valider l'EDL
            </>
          )}
        </Button>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-12"
            onClick={onBack}
            disabled={isSaving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button 
            variant="secondary"
            className="flex-1 h-12"
            onClick={() => handleSave('brouillon')}
            disabled={isSaving}
          >
            <FileEdit className="mr-2 h-4 w-4" />
            Brouillon
          </Button>
        </div>
      </div>

      {/* Edit Task Sheet */}
      <Sheet open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Modifier la tâche</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100%-8rem)]">
            <div className="space-y-4 pr-2">
              <div className="space-y-2">
                <Label htmlFor="taskName">Nom de la tâche</Label>
                <Input
                  id="taskName"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Titre de la tâche"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Description détaillée"
                  rows={3}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Pièce / Zone</Label>
                <Input
                  id="location"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="Ex: Cuisine, Salle de bain..."
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select 
                  value={editForm.priority} 
                  onValueChange={(value) => setEditForm({ ...editForm, priority: value })}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Choisir une priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observations</Label>
                <Textarea
                  id="observations"
                  value={editForm.observations}
                  onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })}
                  placeholder="Notes ou commentaires..."
                  rows={2}
                  className="text-base"
                />
              </div>

              <Button
                variant="destructive"
                className="w-full h-12 mt-4"
                onClick={() => editingTask && handleDeleteTask(editingTask.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer cette tâche
              </Button>
            </div>
          </ScrollArea>

          <SheetFooter className="pt-4 border-t mt-4">
            <Button 
              className="w-full h-14 text-lg font-semibold"
              onClick={handleSaveEdit}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
