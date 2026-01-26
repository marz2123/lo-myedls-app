import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Video, 
  Mic, 
  FileText, 
  Wand2, 
  Loader2, 
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  MapPin,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Sequence {
  id: string;
  description: string | null;
  transcription: string | null;
  video_url: string | null;
  audio_url: string | null;
  photos: unknown;
  created_at: string;
  endroit_name: string | null;
  zone_type: string | null;
  detected_condition: string | null;
  user_condition: string | null;
  property_locations?: { name: string; location_type: string } | null;
  property_parts?: { name: string; part_type: string } | null;
}

interface ExtractedTask {
  title: string;
  description: string;
  priority: string;
  location: string;
  family_code?: string;
  category_code?: string;
  subcategory_code?: string;
  confidence_score: number;
}

interface SequenceTaskExtractorProps {
  projectId: string;
  onTasksExtracted?: () => void;
}

export function SequenceTaskExtractor({ projectId, onTasksExtracted }: SequenceTaskExtractorProps) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadSequences();
  }, [projectId]);

  const loadSequences = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_sequences')
        .select(`
          id,
          description,
          transcription,
          video_url,
          audio_url,
          photos,
          created_at,
          endroit_name,
          zone_type,
          detected_condition,
          user_condition,
          property_locations!visit_sequences_location_id_fkey (
            name,
            location_type
          ),
          property_parts!visit_sequences_part_id_fkey (
            name,
            part_type
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSequences(data || []);
    } catch (err) {
      console.error('Error loading sequences:', err);
      toast.error("Erreur lors du chargement des séquences");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === sequences.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sequences.map(s => s.id));
    }
  };

  const handleExtract = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Sélectionnez au moins une séquence");
      return;
    }

    setIsExtracting(true);
    setShowResults(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-tasks-from-sequences', {
        body: { 
          projectId,
          sequenceIds: selectedIds 
        }
      });

      if (error) throw error;

      if (data.success) {
        setExtractedTasks(data.tasks || []);
        setShowResults(true);
        toast.success(`${data.summary?.totalTasks || 0} tâches extraites avec succès !`);
        onTasksExtracted?.();
      } else {
        throw new Error(data.error || 'Extraction failed');
      }
    } catch (err) {
      console.error('Error extracting tasks:', err);
      toast.error("Erreur lors de l'extraction des tâches");
    } finally {
      setIsExtracting(false);
    }
  };

  const getConditionBadge = (condition: string | null) => {
    switch (condition) {
      case 'neuf':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Neuf</Badge>;
      case 'bon':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Bon</Badge>;
      case 'a_refaire':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">À refaire</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Non évalué</Badge>;
    }
  };

  const getMediaIcon = (seq: Sequence) => {
    if (seq.video_url) return <Video className="h-4 w-4 text-primary" />;
    if (seq.audio_url) return <Mic className="h-4 w-4 text-orange-500" />;
    if (seq.photos && Array.isArray(seq.photos) && seq.photos.length > 0) return <Eye className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (sequences.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Aucune séquence vidéo/audio disponible</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Effectuez une visite pour capturer des séquences
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Extraction IA depuis séquences</CardTitle>
                <CardDescription>
                  {sequences.length} séquence{sequences.length > 1 ? 's' : ''} disponible{sequences.length > 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Selection header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={selectedIds.length === sequences.length && sequences.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length > 0 
                    ? `${selectedIds.length} séquence${selectedIds.length > 1 ? 's' : ''} sélectionnée${selectedIds.length > 1 ? 's' : ''}`
                    : 'Tout sélectionner'
                  }
                </span>
              </div>
              <Button 
                onClick={handleExtract}
                disabled={selectedIds.length === 0 || isExtracting}
                size="sm"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extraction IA...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Extraire les tâches
                  </>
                )}
              </Button>
            </div>

            {/* Sequences list */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {sequences.map((seq) => (
                  <div
                    key={seq.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors cursor-pointer",
                      selectedIds.includes(seq.id) 
                        ? "bg-primary/5 border-primary/30" 
                        : "bg-card hover:bg-muted/50 border-border"
                    )}
                    onClick={() => toggleSelection(seq.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedIds.includes(seq.id)}
                        onCheckedChange={() => toggleSelection(seq.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getMediaIcon(seq)}
                          <span className="font-medium text-sm truncate">
                            {seq.description || seq.transcription?.slice(0, 50) || 'Séquence sans description'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Clock className="h-3 w-3" />
                          {format(new Date(seq.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                          
                          {(seq.property_parts?.name || seq.property_locations?.name || seq.endroit_name) && (
                            <>
                              <span className="text-muted-foreground/50">•</span>
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">
                                {[
                                  seq.property_parts?.name,
                                  seq.property_locations?.name,
                                  seq.endroit_name
                                ].filter(Boolean).join(' > ')}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {seq.transcription && (
                          <p className="text-xs text-muted-foreground/80 line-clamp-2 italic">
                            "{seq.transcription}"
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          {getConditionBadge(seq.user_condition || seq.detected_condition)}
                          {seq.zone_type && (
                            <Badge variant="secondary" className="text-xs">
                              {seq.zone_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Results preview */}
            {showResults && extractedTasks.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700">
                    {extractedTasks.length} tâche{extractedTasks.length > 1 ? 's' : ''} extraite{extractedTasks.length > 1 ? 's' : ''}
                  </span>
                </div>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {extractedTasks.slice(0, 10).map((task, idx) => (
                      <div key={idx} className="p-2 bg-background rounded border text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{task.title}</span>
                          <Badge 
                            variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {task.priority === 'high' ? 'Urgent' : task.priority === 'medium' ? 'Moyen' : 'Bas'}
                          </Badge>
                        </div>
                        {task.location && (
                          <p className="text-xs text-muted-foreground mt-1">{task.location}</p>
                        )}
                      </div>
                    ))}
                    {extractedTasks.length > 10 && (
                      <p className="text-xs text-center text-muted-foreground py-2">
                        + {extractedTasks.length - 10} autres tâches...
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
