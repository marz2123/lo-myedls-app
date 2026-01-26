import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2,
  CheckCircle2,
  XCircle,
  Scissors,
  AudioWaveform,
  Eye,
  FileText,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CaptureData } from '../CaptureWizard';

interface StepAIProcessingProps {
  captureData: CaptureData;
  updateCaptureData: (updates: Partial<CaptureData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type StepStatus = 'pending' | 'processing' | 'complete' | 'error';

type ProcessingStep = {
  id: string;
  label: string;
  description: string;
  icon: typeof Scissors;
  status: StepStatus;
  model?: string;
};

export const StepAIProcessing = ({
  captureData,
  updateCaptureData,
  onNext,
  onBack,
}: StepAIProcessingProps) => {
  const isVideoMode = captureData.captureMode === 'video_walkthrough';
  
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { 
      id: 'segment', 
      label: 'Découpage vidéo', 
      description: 'Segmentation par pièce/zone',
      icon: Scissors,
      status: 'pending',
      model: 'Gemini 2.5'
    },
    { 
      id: 'transcribe', 
      label: 'Transcription audio', 
      description: 'Conversion parole → texte',
      icon: AudioWaveform,
      status: 'pending',
      model: 'Whisper-1'
    },
    { 
      id: 'vision', 
      label: 'Analyse visuelle', 
      description: 'Détection éléments et états',
      icon: Eye,
      status: 'pending',
      model: 'GPT-4 Vision'
    },
    { 
      id: 'extract', 
      label: 'Extraction des tâches', 
      description: 'Génération tâches FT/CT/ST',
      icon: FileText,
      status: 'pending',
      model: 'GPT-4.1'
    },
  ]);
  
  const [overallProgress, setOverallProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<string | null>(null);
  const processingRef = useRef(false);

  // Auto-navigate when complete
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        onNext();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onNext]);

  useEffect(() => {
    if (!processingRef.current) {
      processingRef.current = true;
      startProcessing();
    }
  }, []);

  const updateStepStatus = (stepId: string, status: StepStatus) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const startProcessing = async () => {
    try {
      const isVideo = captureData.captureMode === 'video_walkthrough';
      let videoUrl: string | null = null;
      let audioBase64: string | null = null;
      const photoUrls = captureData.photos.map(p => p.url);

      // Upload media first if we have video
      if (captureData.videoBlob) {
        const videoFileName = `edl_${captureData.projectId}_${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('visit-videos')
          .upload(videoFileName, captureData.videoBlob);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('visit-videos')
            .getPublicUrl(videoFileName);
          videoUrl = urlData.publicUrl;
        }

        // Extract audio as base64
        const reader = new FileReader();
        audioBase64 = await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(captureData.videoBlob!);
        });
      }

      // Process audio blobs if in photo_voice mode
      if (captureData.audioBlobs && captureData.audioBlobs.length > 0) {
        // Combine all audio blobs or use the first one
        const firstAudioBlob = captureData.audioBlobs[0];
        const reader = new FileReader();
        audioBase64 = await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(firstAudioBlob);
        });
      }

      const projectContext = {
        projectId: captureData.projectId || '',
        address: captureData.projectAddress,
        edlType: captureData.edlType || '',
      };

      // Step 1: Video Segmentation
      updateStepStatus('segment', 'processing');
      setOverallProgress(10);

      let segments: any[] = [];
      
      if (isVideo && videoUrl) {
        const { data: segmentData, error: segmentError } = await supabase.functions.invoke(
          'edl-ai-pipeline',
          {
            body: {
              step: 'segment',
              videoUrl,
              captureMode: 'video',
              projectContext,
            }
          }
        );

        if (segmentError) {
          throw new Error(`Segmentation: ${segmentError.message}`);
        }

        segments = segmentData?.segments || [];
      }

      updateStepStatus('segment', 'complete');
      setOverallProgress(25);

      // Step 2: Transcription
      updateStepStatus('transcribe', 'processing');
      
      let globalTranscript = '';
      let segmentTranscripts: any[] = [];

      if (audioBase64) {
        const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke(
          'edl-ai-pipeline',
          {
            body: {
              step: 'transcribe',
              audioBase64,
              segments,
              captureMode: isVideo ? 'video' : 'photo_voice',
            }
          }
        );

        if (transcribeError) {
          console.warn('Transcription warning:', transcribeError);
          // Continue anyway - vision might be enough
        } else {
          globalTranscript = transcribeData?.globalTranscript || '';
          segmentTranscripts = transcribeData?.segmentTranscripts || [];
        }
      }

      updateCaptureData({ transcript: globalTranscript });
      updateStepStatus('transcribe', 'complete');
      setOverallProgress(50);

      // Step 3: Vision Analysis
      updateStepStatus('vision', 'processing');

      let visionElements: any[] = [];

      const imagesToAnalyze = isVideo && videoUrl ? [videoUrl] : photoUrls;

      if (imagesToAnalyze.length > 0) {
        const { data: visionData, error: visionError } = await supabase.functions.invoke(
          'edl-ai-pipeline',
          {
            body: {
              step: 'vision',
              photoUrls: isVideo ? undefined : photoUrls,
              videoUrl: isVideo ? videoUrl : undefined,
              segments,
              captureMode: isVideo ? 'video' : 'photo_voice',
            }
          }
        );

        if (visionError) {
          console.warn('Vision analysis warning:', visionError);
        } else {
          visionElements = visionData?.visionElements || [];
        }
      }

      updateStepStatus('vision', 'complete');
      setOverallProgress(75);

      // Step 4: Task Extraction
      updateStepStatus('extract', 'processing');

      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        'edl-ai-pipeline',
        {
          body: {
            step: 'extract',
            globalTranscript,
            visionElements,
            projectContext,
            captureMode: isVideo ? 'video' : 'photo_voice',
          }
        }
      );

      if (extractError) {
        console.error('[StepAIProcessing] Extract error:', extractError);
        
        // Check for rate limit or payment errors
        if (extractError.message?.includes('429') || extractError.message?.includes('Rate limit')) {
          throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
        }
        if (extractError.message?.includes('402') || extractError.message?.includes('Payment')) {
          throw new Error('Crédits insuffisants. Veuillez recharger votre compte Lovable.');
        }
        
        // Check for network/DNS errors (common on mobile)
        if (extractError.message?.includes('Failed to fetch') || 
            extractError.message?.includes('Network') || 
            extractError.message?.includes('DNS') ||
            extractError.message?.includes('non-2xx')) {
          throw new Error('Erreur de connexion réseau. Vérifiez votre connexion Internet et réessayez.');
        }
        
        // Check for DTC taxonomy errors
        if (extractError.message?.includes('DTC taxonomy') || 
            extractError.message?.includes('nomenclature') ||
            extractError.message?.includes('empty or incomplete')) {
          throw new Error('Impossible de charger la nomenclature DTC. Vérifiez que les données sont bien importées dans Supabase.');
        }
        
        // Generic error with more context
        const errorMsg = extractError.message || 'Erreur inconnue';
        throw new Error(`Erreur d'extraction: ${errorMsg}`);
      }
      
      // Check if response contains an error field (Edge Function returned 200 but with error in body)
      if (extractData?.error) {
        console.error('[StepAIProcessing] Extract data contains error:', extractData.error);
        
        if (extractData.error.includes('DTC taxonomy') || extractData.error.includes('nomenclature')) {
          throw new Error('Impossible de charger la nomenclature DTC. Vérifiez que les données sont bien importées dans Supabase.');
        }
        
        throw new Error(`Erreur d'extraction: ${extractData.error}`);
      }

      const extractedTasks = extractData?.extractedTasks || [];
      const edlSummary = extractData?.edlSummary || null;

      // Update segments with transcripts
      const enrichedSegments = segments.map((seg: any, i: number) => ({
        id: `seg_${i}`,
        startTime: seg.startTime,
        endTime: seg.endTime,
        transcript: segmentTranscripts[i]?.text || '',
        location: seg.location || 'Non identifié',
        zone: seg.zone || '',
        frameUrl: seg.frameUrl,
      }));

      updateCaptureData({ 
        segments: enrichedSegments,
        extractedTasks,
        edlSummary,
      });

      updateStepStatus('extract', 'complete');
      setOverallProgress(100);
      setIsComplete(true);

      toast.success(`Analyse terminée ! ${extractedTasks.length} tâches extraites.`);

    } catch (error) {
      console.error('Processing error:', error);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inattendue');
      
      // Find which step was processing and mark it as error
      setSteps(prev => {
        const erroredStep = prev.find(s => s.status === 'processing');
        if (erroredStep) {
          setErrorStep(erroredStep.id);
        }
        return prev.map(step => 
          step.status === 'processing' ? { ...step, status: 'error' as StepStatus } : step
        );
      });
      
      toast.error('Erreur lors du traitement IA');
    }
  };

  const retryStep = async () => {
    if (!errorStep) return;
    
    setHasError(false);
    setErrorMessage(null);
    
    // Reset error step to pending
    updateStepStatus(errorStep, 'pending');
    
    // Restart processing from the failed step
    processingRef.current = false;
    startProcessing();
  };

  const retryAll = () => {
    setHasError(false);
    setErrorMessage(null);
    setErrorStep(null);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as StepStatus })));
    setOverallProgress(0);
    processingRef.current = false;
    startProcessing();
  };

  const completedSteps = steps.filter(s => s.status === 'complete').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            {isComplete ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : hasError ? (
              <XCircle className="h-8 w-8 text-destructive" />
            ) : (
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            )}
          </div>
          <h2 className="text-2xl font-bold">
            {isComplete ? 'Analyse terminée !' : hasError ? 'Erreur de traitement' : 'Analyse en cours…'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isComplete 
              ? `${captureData.extractedTasks.length} tâches extraites avec succès`
              : hasError 
                ? 'Une erreur s\'est produite pendant l\'analyse'
                : 'Nous analysons ta vidéo / tes photos pour générer l\'EDL et les tâches.'
            }
          </p>
        </div>

        {/* Overall progress */}
        {!isComplete && !hasError && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}

        {/* Steps checklist */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const stepNumber = index + 1;
            
            return (
              <Card 
                key={step.id}
                className={cn(
                  "p-4 transition-all",
                  step.status === 'processing' && "ring-2 ring-primary bg-primary/5",
                  step.status === 'error' && "ring-2 ring-destructive bg-destructive/5",
                  step.status === 'complete' && "bg-green-500/5"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Step indicator */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold transition-all",
                    step.status === 'complete' && "bg-green-500 text-white",
                    step.status === 'processing' && "bg-primary text-primary-foreground",
                    step.status === 'error' && "bg-destructive text-destructive-foreground",
                    step.status === 'pending' && "bg-muted text-muted-foreground"
                  )}>
                    {step.status === 'complete' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : step.status === 'processing' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : step.status === 'error' ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  
                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{step.label}</span>
                      {step.status === 'processing' && step.model && (
                        <Badge variant="secondary" className="text-xs">
                          {step.model}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Status badge for complete */}
                  {step.status === 'complete' && step.model && (
                    <Badge variant="outline" className="text-xs shrink-0 text-green-600 border-green-600">
                      ✓ {step.model}
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Error details and retry */}
        {hasError && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Erreur de traitement</p>
                <p className="text-sm text-destructive/80 mt-1">
                  {errorMessage}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={retryStep}
                    disabled={!errorStep}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer cette étape
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={retryAll}
                  >
                    Tout recommencer
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Success summary */}
        {isComplete && captureData.edlSummary && (
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-700 dark:text-green-400">
                  EDL généré avec succès
                </p>
                <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                  {captureData.edlSummary.generalState}
                </p>
                {captureData.edlSummary.criticalIssues.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-amber-600">
                      {captureData.edlSummary.criticalIssues.length} point(s) critique(s) détecté(s)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-6 border-t bg-background safe-area-bottom">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="lg"
            className="flex-1 h-14"
            onClick={onBack}
            disabled={!hasError && !isComplete}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Button>
          <Button 
            size="lg"
            className="flex-1 h-14 text-lg font-semibold"
            disabled={!isComplete && !hasError}
            onClick={onNext}
          >
            {isComplete ? 'Voir les résultats' : 'Continuer'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
