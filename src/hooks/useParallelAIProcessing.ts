// Parallel AI Processing Hook
// Runs segmentation, transcription, and vision analysis in parallel
// with live partial results and checklist updates

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiRobustnessLayer } from '@/services/aiRobustnessLayer';
import { eventLogger } from '@/services/eventLogger';
import { useToast } from '@/hooks/use-toast';

export interface AIStep {
  id: 'segmentation' | 'transcription' | 'vision' | 'extraction';
  label: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

interface PartialResult {
  type: 'transcript_chunk' | 'vision_detection' | 'task_extracted' | 'segment_detected';
  data: any;
  timestamp: number;
}

interface UseParallelAIOptions {
  onStepUpdate?: (steps: AIStep[]) => void;
  onPartialResult?: (result: PartialResult) => void;
  onAllComplete?: (results: { transcription: string; tasks: any[]; segments: any[] }) => void;
  onError?: (step: string, error: string) => void;
}

export const useParallelAIProcessing = (options: UseParallelAIOptions = {}) => {
  const { onStepUpdate, onPartialResult, onAllComplete, onError } = options;
  const { toast } = useToast();
  
  const [steps, setSteps] = useState<AIStep[]>([
    { id: 'segmentation', label: 'Découpage vidéo', status: 'pending', progress: 0 },
    { id: 'transcription', label: 'Transcription', status: 'pending', progress: 0 },
    { id: 'vision', label: 'Analyse visuelle', status: 'pending', progress: 0 },
    { id: 'extraction', label: 'Extraction tâches', status: 'pending', progress: 0 },
  ]);
  
  const [partialResults, setPartialResults] = useState<PartialResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef(false);
  const resultsRef = useRef<{
    transcription: string;
    segments: any[];
    visionResults: any[];
    tasks: any[];
  }>({ transcription: '', segments: [], visionResults: [], tasks: [] });

  const updateStep = useCallback((id: AIStep['id'], updates: Partial<AIStep>) => {
    setSteps(prev => {
      const newSteps = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      onStepUpdate?.(newSteps);
      return newSteps;
    });
  }, [onStepUpdate]);

  const addPartialResult = useCallback((result: PartialResult) => {
    setPartialResults(prev => [...prev, result]);
    onPartialResult?.(result);
  }, [onPartialResult]);

  // Transcription with live chunks
  const runTranscription = useCallback(async (audioData: string): Promise<string> => {
    updateStep('transcription', { status: 'processing', progress: 10 });
    
    eventLogger.log({
      category: 'ai',
      action: 'transcription_started',
    });

    const { data, error, usedFallback } = await aiRobustnessLayer.callWithRetry(
      async () => {
        const response = await supabase.functions.invoke('transcribe-visit-audio', {
          body: { audio: audioData }
        });
        if (response.error) throw response.error;
        return response.data;
      },
      async () => {
        // Fallback to Gemini transcription
        updateStep('transcription', { progress: 30 });
        const response = await supabase.functions.invoke('transcribe-and-extract', {
          body: { audio: audioData }
        });
        if (response.error) throw response.error;
        return response.data;
      }
    );

    if (error) {
      updateStep('transcription', { status: 'error', error });
      onError?.('transcription', error);
      throw new Error(error);
    }

    const transcript = data?.text || data?.transcript || '';
    
    // Emit partial chunks for live display
    const words = transcript.split(' ');
    const chunkSize = 10;
    for (let i = 0; i < words.length; i += chunkSize) {
      if (abortRef.current) break;
      const chunk = words.slice(i, i + chunkSize).join(' ');
      addPartialResult({
        type: 'transcript_chunk',
        data: chunk,
        timestamp: Date.now(),
      });
      updateStep('transcription', { progress: 30 + Math.round((i / words.length) * 60) });
      await new Promise(r => setTimeout(r, 50)); // Small delay for visual effect
    }

    updateStep('transcription', { 
      status: 'complete', 
      progress: 100, 
      result: transcript 
    });
    
    if (usedFallback) {
      toast({
        title: "Transcription alternative utilisée",
        description: "L'analyse complète prendra un peu plus de temps, tu peux continuer.",
      });
    }

    resultsRef.current.transcription = transcript;
    return transcript;
  }, [updateStep, addPartialResult, onError, toast]);

  // Vision analysis with live detections
  const runVisionAnalysis = useCallback(async (frames: string[]): Promise<any[]> => {
    updateStep('vision', { status: 'processing', progress: 10 });
    
    eventLogger.log({
      category: 'ai',
      action: 'vision_analysis_started',
      value: frames.length,
    });

    const results: any[] = [];
    
    // Process frames in parallel batches of 3
    const batchSize = 3;
    for (let i = 0; i < frames.length; i += batchSize) {
      if (abortRef.current) break;
      
      const batch = frames.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (frame, idx) => {
          const { data, error } = await aiRobustnessLayer.analyzeFrameWithFallback(frame);
          
          if (data?.detections) {
            // Emit live detections
            data.detections.forEach((detection: any) => {
              addPartialResult({
                type: 'vision_detection',
                data: detection,
                timestamp: Date.now(),
              });
            });
          }
          
          return { data, error, frameIndex: i + idx };
        })
      );
      
      batchResults.forEach(r => {
        if (r.data) results.push(r.data);
      });
      
      updateStep('vision', { 
        progress: Math.round(((i + batch.length) / frames.length) * 90) + 10 
      });
    }

    updateStep('vision', { status: 'complete', progress: 100, result: results });
    resultsRef.current.visionResults = results;
    return results;
  }, [updateStep, addPartialResult]);

  // Video segmentation
  const runSegmentation = useCallback(async (videoUrl: string, audioData?: string): Promise<any[]> => {
    updateStep('segmentation', { status: 'processing', progress: 20 });
    
    eventLogger.log({
      category: 'ai',
      action: 'segmentation_started',
    });

    const { data, error } = await aiRobustnessLayer.callWithRetry(
      async () => {
        const response = await supabase.functions.invoke('segment-video-capture', {
          body: { 
            videoUrl,
            audioBase64: audioData,
            projectContext: {}
          }
        });
        if (response.error) throw response.error;
        return response.data;
      }
    );

    if (error) {
      updateStep('segmentation', { status: 'error', error });
      onError?.('segmentation', error);
      // Don't throw - segmentation failure shouldn't block everything
      return [];
    }

    const segments = data?.segments || [];
    
    // Emit segments as they're "found"
    for (const segment of segments) {
      addPartialResult({
        type: 'segment_detected',
        data: segment,
        timestamp: Date.now(),
      });
      await new Promise(r => setTimeout(r, 100));
    }

    updateStep('segmentation', { status: 'complete', progress: 100, result: segments });
    resultsRef.current.segments = segments;
    return segments;
  }, [updateStep, addPartialResult, onError]);

  // Task extraction (depends on transcription + vision)
  const runTaskExtraction = useCallback(async (
    transcription: string,
    visionResults: any[],
    projectId?: string
  ): Promise<any[]> => {
    updateStep('extraction', { status: 'processing', progress: 20 });
    
    eventLogger.log({
      category: 'ai',
      action: 'task_extraction_started',
    });

    const { data, error } = await aiRobustnessLayer.callWithRetry(
      async () => {
        try {
          const response = await supabase.functions.invoke('extract-tasks', {
            body: {
              description: transcription,
              visionContext: visionResults,
              projectId,
              mode: 'comprehensive'
            }
          });
          
          if (response.error) {
            // Améliorer le message d'erreur pour les problèmes de connexion
            const errorMessage = response.error.message || 'Unknown error';
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network') || errorMessage.includes('DNS')) {
              throw new Error('Impossible de se connecter à Supabase. Vérifiez votre connexion Internet.');
            }
            if (errorMessage.includes('DTC taxonomy') || errorMessage.includes('nomenclature')) {
              throw new Error('Impossible de charger la nomenclature DTC. Vérifiez que les données sont bien importées.');
            }
            throw response.error;
          }
          
          // Vérifier si la réponse contient une erreur
          if (response.data?.error) {
            throw new Error(response.data.error);
          }
          
          return response.data;
        } catch (err: any) {
          // Améliorer les messages d'erreur réseau
          if (err.message?.includes('Failed to fetch') || err.message?.includes('Network')) {
            throw new Error('Erreur de connexion réseau. Vérifiez votre connexion Internet et réessayez.');
          }
          throw err;
        }
      }
    );

    if (error) {
      const errorMessage = typeof error === 'string' ? error : error.message || 'Erreur inconnue lors de l\'extraction des tâches';
      updateStep('extraction', { status: 'error', error: errorMessage });
      onError?.('extraction', errorMessage);
      return [];
    }

    const tasks = data?.tasks || [];
    
    // Emit tasks as extracted
    for (const task of tasks) {
      addPartialResult({
        type: 'task_extracted',
        data: task,
        timestamp: Date.now(),
      });
      await new Promise(r => setTimeout(r, 150));
    }

    updateStep('extraction', { status: 'complete', progress: 100, result: tasks });
    resultsRef.current.tasks = tasks;
    return tasks;
  }, [updateStep, addPartialResult, onError]);

  // Main parallel processing function
  const processCapture = useCallback(async ({
    audioData,
    videoUrl,
    frames,
    projectId,
  }: {
    audioData?: string;
    videoUrl?: string;
    frames?: string[];
    projectId?: string;
  }) => {
    setIsProcessing(true);
    abortRef.current = false;
    setPartialResults([]);
    resultsRef.current = { transcription: '', segments: [], visionResults: [], tasks: [] };

    eventLogger.log({
      category: 'capture',
      action: 'ai_processing_started',
      projectId,
    });

    try {
      // Run transcription, segmentation, and vision in parallel
      const parallelPromises: Promise<any>[] = [];

      if (audioData) {
        parallelPromises.push(
          runTranscription(audioData).catch(e => {
            console.error('Transcription error:', e);
            return '';
          })
        );
      }

      if (videoUrl && audioData) {
        parallelPromises.push(
          runSegmentation(videoUrl, audioData).catch(e => {
            console.error('Segmentation error:', e);
            return [];
          })
        );
      }

      if (frames && frames.length > 0) {
        parallelPromises.push(
          runVisionAnalysis(frames).catch(e => {
            console.error('Vision error:', e);
            return [];
          })
        );
      }

      // Wait for all parallel steps
      await Promise.all(parallelPromises);

      // Now run task extraction with results
      if (!abortRef.current) {
        await runTaskExtraction(
          resultsRef.current.transcription,
          resultsRef.current.visionResults,
          projectId
        );
      }

      eventLogger.log({
        category: 'capture',
        action: 'ai_processing_complete',
        projectId,
        metadata: {
          tasksCount: resultsRef.current.tasks.length,
          segmentsCount: resultsRef.current.segments.length,
        },
      });

      onAllComplete?.({
        transcription: resultsRef.current.transcription,
        tasks: resultsRef.current.tasks,
        segments: resultsRef.current.segments,
      });

      return resultsRef.current;
    } catch (error: any) {
      eventLogger.logAIError(error, 'parallel_processing', { projectId });
      toast({
        title: "Problème de traitement",
        description: "On réessaie en arrière-plan. Tu peux continuer.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [runTranscription, runSegmentation, runVisionAnalysis, runTaskExtraction, onAllComplete, toast]);

  const abort = useCallback(() => {
    abortRef.current = true;
    setIsProcessing(false);
  }, []);

  const reset = useCallback(() => {
    setSteps([
      { id: 'segmentation', label: 'Découpage vidéo', status: 'pending', progress: 0 },
      { id: 'transcription', label: 'Transcription', status: 'pending', progress: 0 },
      { id: 'vision', label: 'Analyse visuelle', status: 'pending', progress: 0 },
      { id: 'extraction', label: 'Extraction tâches', status: 'pending', progress: 0 },
    ]);
    setPartialResults([]);
    setIsProcessing(false);
    abortRef.current = false;
  }, []);

  return {
    steps,
    partialResults,
    isProcessing,
    processCapture,
    abort,
    reset,
  };
};

export default useParallelAIProcessing;
