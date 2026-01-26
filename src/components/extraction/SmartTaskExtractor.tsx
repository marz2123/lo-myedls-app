import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Camera, Video, FileText, Mic, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartTaskExtractorProps {
  projectId: string;
  onTasksExtracted?: () => void;
}

type ExtractionMode = 'text' | 'photo' | 'video' | 'audio';

interface ExtractedTask {
  title: string;
  description: string;
  location: string;
  confidence: number;
  family?: string;
  category?: string;
  subcategory?: string;
}

export const SmartTaskExtractor = ({ projectId, onTasksExtracted }: SmartTaskExtractorProps) => {
  const [mode, setMode] = useState<ExtractionMode>('text');
  const [textInput, setTextInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // AI Suggestions en temps réel pour le texte
  const getAISuggestions = async (text: string) => {
    if (text.length < 10) {
      setAiSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-extraction-hints', {
        body: { text, mode: 'quick' }
      });

      if (!error && data?.hints) {
        setAiSuggestions(data.hints);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  };

  // Extraction intelligente selon le mode
  const extractTasks = async () => {
    if (mode === 'text' && !textInput.trim()) {
      toast.error("Veuillez entrer du texte");
      return;
    }

    if ((mode === 'photo' || mode === 'video') && !selectedFile) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setIsExtracting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      let extractionResult;

      switch (mode) {
        case 'text':
          extractionResult = await supabase.functions.invoke('extract-tasks', {
            body: {
              text: textInput,
              projectId,
              userId: user.id
            }
          });
          break;

        case 'photo':
          if (!selectedFile) return;
          const photoBase64 = await fileToBase64(selectedFile);
          extractionResult = await supabase.functions.invoke('extract-tasks', {
            body: {
              imageData: photoBase64,
              projectId,
              userId: user.id
            }
          });
          break;

        case 'audio':
          if (!selectedFile) return;
          const audioFormData = new FormData();
          audioFormData.append('audio', selectedFile);
          audioFormData.append('projectId', projectId);
          extractionResult = await supabase.functions.invoke('transcribe-and-extract', {
            body: { audioFile: selectedFile, projectId, userId: user.id }
          });
          break;

        default:
          throw new Error("Mode non supporté");
      }

      if (extractionResult.error) throw extractionResult.error;

      const tasks = extractionResult.data?.tasks || [];
      setExtractedTasks(tasks);
      toast.success(`${tasks.length} tâche(s) extraite(s) avec succès`);

    } catch (error) {
      console.error('Extraction error:', error);
      toast.error("Erreur lors de l'extraction");
    } finally {
      setIsExtracting(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const validateAndSaveTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const tasksToInsert = extractedTasks.map(task => ({
        project_id: projectId,
        user_id: user.id,
        title: task.title,
        description: task.description,
        location: task.location,
        detection_confidence: task.confidence,
        source_type: mode
      }));

      const { error } = await supabase
        .from('extracted_tasks')
        .insert(tasksToInsert);

      if (error) throw error;

      toast.success("Tâches ajoutées au projet");
      setExtractedTasks([]);
      setTextInput("");
      setSelectedFile(null);
      onTasksExtracted?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Extraction Intelligente de Tâches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="grid grid-cols-4 gap-2">
          <Button
            variant={mode === 'text' ? 'default' : 'outline'}
            onClick={() => setMode('text')}
            className="flex flex-col gap-1 h-auto py-3"
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">Texte</span>
          </Button>
          <Button
            variant={mode === 'photo' ? 'default' : 'outline'}
            onClick={() => setMode('photo')}
            className="flex flex-col gap-1 h-auto py-3"
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">Photo</span>
          </Button>
          <Button
            variant={mode === 'video' ? 'default' : 'outline'}
            onClick={() => setMode('video')}
            className="flex flex-col gap-1 h-auto py-3"
          >
            <Video className="h-5 w-5" />
            <span className="text-xs">Vidéo</span>
          </Button>
          <Button
            variant={mode === 'audio' ? 'default' : 'outline'}
            onClick={() => setMode('audio')}
            className="flex flex-col gap-1 h-auto py-3"
          >
            <Mic className="h-5 w-5" />
            <span className="text-xs">Audio</span>
          </Button>
        </div>

        {/* Input Area */}
        {mode === 'text' && (
          <div className="space-y-2">
            <Textarea
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                getAISuggestions(e.target.value);
              }}
              placeholder="Décrivez les tâches à effectuer... L'IA extraira automatiquement les informations importantes."
              rows={6}
              className="resize-none"
            />
            {aiSuggestions.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">💡 Suggestions IA:</div>
                <div className="flex flex-wrap gap-1">
                  {aiSuggestions.map((hint, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {hint}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(mode === 'photo' || mode === 'video' || mode === 'audio') && (
          <div className="space-y-2">
            <input
              type="file"
              accept={
                mode === 'photo' ? 'image/*' :
                mode === 'video' ? 'video/*' :
                'audio/*'
              }
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </div>
            )}
          </div>
        )}

        {/* Extract Button */}
        <Button
          onClick={extractTasks}
          disabled={isExtracting}
          className="w-full"
          size="lg"
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Extraction en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Extraire les tâches avec IA
            </>
          )}
        </Button>

        {/* Preview Extracted Tasks */}
        {extractedTasks.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Tâches extraites ({extractedTasks.length})</h4>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Prêt à valider
              </Badge>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {extractedTasks.map((task, idx) => (
                <Card key={idx} className="bg-muted/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      </div>
                      <Badge variant="outline">
                        {(task.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>📍 {task.location}</span>
                      {task.family && <span>• {task.family}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={validateAndSaveTasks}
              className="w-full"
              size="lg"
              variant="default"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Valider et ajouter {extractedTasks.length} tâche(s)
            </Button>
          </div>
        )}

        {/* AI Assistant Tips */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
              <Sparkles className="h-4 w-4" />
              Conseils pour une meilleure extraction
            </div>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Décrivez clairement la localisation (pièce, zone)</li>
              <li>Mentionnez l'état et les travaux nécessaires</li>
              <li>Pour les photos: assurez-vous d'une bonne luminosité</li>
              <li>Pour l'audio: parlez clairement et évitez le bruit de fond</li>
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};