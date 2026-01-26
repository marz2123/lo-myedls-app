import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Send, Loader2, Sparkles, X, Wand2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ============= WEB SPEECH API TYPES =============

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ============= COMPONENT PROPS =============

interface TextVoiceRecorderProps {
  projectId: string;
  locationId: string;
  locationName: string;
  pieceName?: string;
  zoneName?: string;
  zoneType?: string;
  partieType?: 'commune' | 'privative';
  onComplete: () => void;
  onCancel: () => void;
}

// ============= MAIN COMPONENT =============

export const TextVoiceRecorder = ({
  projectId,
  locationId,
  locationName,
  pieceName,
  zoneName,
  zoneType,
  partieType,
  onComplete,
  onCancel,
}: TextVoiceRecorderProps) => {
  const [description, setDescription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<string[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setDescription(prev => prev + finalTranscript);
          setInterimText('');
        } else {
          setInterimText(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Permission micro refusée');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Reconnaissance vocale non supportée sur ce navigateur');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('🎤 Dictée vocale activée - Parlez maintenant');
      } catch (e) {
        toast.error('Erreur démarrage micro');
      }
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Ajoutez une description du problème');
      return;
    }

    setIsSubmitting(true);
    setIsGeneratingTasks(true);

    try {
      // Build complete location path
      const fullPath = [
        partieType === 'commune' ? 'Partie Commune' : 'Partie Privative',
        locationName,
        pieceName,
        zoneName,
      ].filter(Boolean).join(' › ');

      // Create problem in database
      const { data: problemData, error: problemError } = await supabase
        .from('identified_problems')
        .insert({
          project_id: projectId,
          location_id: locationId,
          title: description.slice(0, 100),
          description: description,
          severity: 'moderate',
          origine: 'text_voice',
          zone_type: zoneType as any,
        })
        .select()
        .single();

      if (problemError) throw problemError;

      // Call AI to generate FT/CT/ST tasks
      toast.info('IA analyse le problème...', { id: 'ai-analysis' });

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('extract-tasks', {
        body: {
          text: description,
          context: {
            partie: partieType,
            lieu: locationName,
            endroit: pieceName,
            zone: zoneName,
            fullPath: fullPath,
          },
          projectId: projectId,
          problemId: problemData.id,
        },
      });

      if (aiError) {
        console.error('AI task extraction error:', aiError);
        toast.warning('Problème enregistré, mais génération des tâches échouée', { id: 'ai-analysis' });
      } else if (aiResponse?.tasks && aiResponse.tasks.length > 0) {
        // Save generated tasks
        const tasksToInsert = aiResponse.tasks.map((task: any) => ({
          project_id: projectId,
          problem_id: problemData.id,
          location_id: locationId,
          title: task.title,
          description: task.description,
          family_id: task.familyId || null,
          category_id: task.categoryId || null,
          subcategory_id: task.subcategoryId || null,
          work_type: task.workType || null,
          priority: task.priority || 'medium',
          status: 'pending',
        }));

        const { error: tasksError } = await supabase
          .from('problem_tasks')
          .insert(tasksToInsert);

        if (tasksError) {
          console.error('Error saving tasks:', tasksError);
        } else {
          setGeneratedTasks(aiResponse.tasks.map((t: any) => t.title));
          toast.success(
            `✨ ${aiResponse.tasks.length} tâche${aiResponse.tasks.length > 1 ? 's' : ''} générée${aiResponse.tasks.length > 1 ? 's' : ''} par l'IA`,
            { id: 'ai-analysis' }
          );
        }
      } else {
        toast.success('Problème enregistré', { id: 'ai-analysis' });
      }

      // Reset and complete
      setDescription('');
      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
      setIsGeneratingTasks(false);
    }
  };

  const fullPath = [locationName, pieceName, zoneName].filter(Boolean).join(' › ');

  return (
    <Card className="overflow-hidden border-0 shadow-2xl">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Description du problème
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{fullPath}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Text Area */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Textarea
              value={description + interimText}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème observé...&#10;&#10;Ex: Fissure sur le mur côté fenêtre, longueur environ 1 mètre, infiltration d'eau probable, peinture écaillée autour."
              className={cn(
                "min-h-[180px] text-base resize-none rounded-2xl pr-4 transition-all",
                isListening && "ring-2 ring-purple-500 border-purple-500"
              )}
            />
            {interimText && (
              <span className="absolute bottom-3 left-3 text-muted-foreground/50 italic text-sm">
                {interimText}
              </span>
            )}
          </div>

          {/* Voice indicator */}
          {isListening && (
            <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 animate-pulse">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-ping" />
              <span className="text-sm font-medium text-purple-600">
                🎤 Dictée vocale active — Parlez naturellement...
              </span>
            </div>
          )}

          {/* Generated tasks preview */}
          {generatedTasks.length > 0 && (
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">Tâches générées</span>
              </div>
              <ul className="space-y-1">
                {generatedTasks.map((task, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Mic Button */}
            <Button
              type="button"
              variant={isListening ? "default" : "outline"}
              size="lg"
              onClick={toggleListening}
              disabled={isSubmitting}
              className={cn(
                "h-16 w-16 rounded-2xl transition-all flex-shrink-0",
                isListening && "bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/30"
              )}
            >
              {isListening ? (
                <MicOff className="h-7 w-7" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </Button>

            {/* Submit Button */}
            <Button
              type="button"
              size="lg"
              onClick={handleSubmit}
              disabled={!description.trim() || isSubmitting}
              className="flex-1 h-16 rounded-2xl text-lg font-bold gap-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-xl shadow-purple-500/25"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {isGeneratingTasks ? 'IA génère les tâches...' : 'Enregistrement...'}
                </>
              ) : (
                <>
                  <Wand2 className="h-6 w-6" />
                  Enregistrer + IA
                </>
              )}
            </Button>
          </div>

          {/* Help text */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl">
            <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">L'IA va automatiquement :</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Analyser votre description</li>
                <li>Générer les tâches FT/CT/ST</li>
                <li>Classifier selon le DSC</li>
                <li>Estimer les quantités si mentionnées</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
