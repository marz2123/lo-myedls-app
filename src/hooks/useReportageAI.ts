import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOpenAIRealtime } from './useOpenAIRealtime';
import { toast } from 'sonner';

// ============= TYPES =============

interface AnalysisResult {
  elements: Array<{
    name: string;
    state: 'neuf' | 'bon' | 'usure_normale' | 'degrade' | 'tres_degrade';
    material?: string;
    description?: string;
  }>;
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    location?: string;
  }>;
  description: string;
  etat_general: string;
  roomType?: string;
  recommandations?: string[];
}

interface ExtractedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  estimatedCost?: number;
}

interface CaptureResult {
  id: string;
  type: 'photo' | 'video' | 'voice';
  timestamp: Date;
  mediaUrl?: string;
  transcript?: string;
  analysis?: AnalysisResult;
  tasks?: ExtractedTask[];
}

interface UseReportageAIOptions {
  projectId: string;
  locationId?: string;
  locationName?: string;
  zoneType?: string;
  onTranscript?: (text: string) => void;
  onAnalysis?: (result: AnalysisResult) => void;
  onTasksExtracted?: (tasks: ExtractedTask[]) => void;
  onCaptureComplete?: (result: CaptureResult) => void;
  onError?: (error: Error) => void;
}

// ============= MAIN HOOK =============

export function useReportageAI(options: UseReportageAIOptions) {
  const {
    projectId,
    locationId,
    locationName,
    zoneType,
    onTranscript,
    onAnalysis,
    onTasksExtracted,
    onCaptureComplete,
    onError
  } = options;

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState<'idle' | 'voice' | 'photo' | 'video'>('idle');
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [captureHistory, setCaptureHistory] = useState<CaptureResult[]>([]);
  
  // Refs
  const processingQueueRef = useRef<Array<() => Promise<void>>>([]);
  const isProcessingQueueRef = useRef(false);

  // OpenAI Realtime for voice
  const realtimeInstructions = `Tu es un assistant expert en états des lieux immobiliers.
Tu aides l'utilisateur à décrire les éléments, anomalies et observations pendant sa visite.
Contexte actuel:
- Lieu: ${locationName || 'Non spécifié'}
- Zone: ${zoneType || 'Non spécifiée'}

Réponds de manière concise et professionnelle en français.
Quand l'utilisateur décrit un élément ou une anomalie, confirme et demande des précisions si nécessaire.`;

  const realtime = useOpenAIRealtime({
    instructions: realtimeInstructions,
    voice: 'alloy',
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        onTranscript?.(text);
      }
    },
    onError: (error) => {
      console.error('[ReportageAI] Realtime error:', error);
      onError?.(error);
    }
  });

  // ============= QUEUE PROCESSOR =============

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || processingQueueRef.current.length === 0) return;
    
    isProcessingQueueRef.current = true;
    
    while (processingQueueRef.current.length > 0) {
      const task = processingQueueRef.current.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('[ReportageAI] Queue task error:', error);
        }
      }
    }
    
    isProcessingQueueRef.current = false;
  }, []);

  const addToQueue = useCallback((task: () => Promise<void>) => {
    processingQueueRef.current.push(task);
    processQueue();
  }, [processQueue]);

  // ============= IMAGE ANALYSIS (Gemini 2.5 Pro via Lovable AI) =============

  const analyzeImage = useCallback(async (
    imageData: string, 
    context?: string
  ): Promise<AnalysisResult | null> => {
    setIsProcessing(true);
    
    try {
      console.log('[ReportageAI] Analyzing image with Gemini 2.5 Pro...');
      
      const { data, error } = await supabase.functions.invoke('gemini-analyze-media', {
        body: {
          imageBase64: imageData,
          context: context || `Lieu: ${locationName}, Zone: ${zoneType}`,
          mode: 'detailed'
        }
      });

      if (error) throw error;

      // Map Gemini response to our format
      const geminiAnalysis = data.analysis;
      const analysis: AnalysisResult = {
        elements: (geminiAnalysis.elements || []).map((el: any) => ({
          name: el.label,
          state: el.state === 'hors_service' ? 'tres_degrade' : el.state,
          material: el.material,
          description: el.anomalies?.join(', ')
        })),
        anomalies: (geminiAnalysis.anomalies || []).map((a: any) => ({
          type: a.type,
          severity: a.severity === 'critique' ? 'high' : a.severity === 'majeur' ? 'high' : a.severity === 'modéré' ? 'medium' : 'low',
          description: a.description,
          location: a.location
        })),
        description: geminiAnalysis.description || '',
        etat_general: geminiAnalysis.global_state || 'bon',
        roomType: geminiAnalysis.room_type
      };

      setLastAnalysis(analysis);
      onAnalysis?.(analysis);
      
      console.log('[ReportageAI] Image analysis complete (Gemini 2.5 Pro):', analysis);
      
      // Auto-extract tasks from anomalies
      if (analysis.anomalies?.length > 0) {
        addToQueue(async () => { await extractTasksFromAnalysis(analysis); });
      }
      
      return analysis;
    } catch (error) {
      console.error('[ReportageAI] Image analysis error:', error);
      onError?.(error instanceof Error ? error : new Error('Image analysis failed'));
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [locationName, zoneType, onAnalysis, onError, addToQueue]);

  // ============= VIDEO ANALYSIS (Gemini 2.5 Pro - Native Video Understanding) =============

  const analyzeVideoFrames = useCallback(async (
    frames: Array<{ base64?: string; url?: string; timestamp?: number }>,
    mode: 'quick' | 'detailed' = 'detailed'
  ): Promise<AnalysisResult | null> => {
    setIsProcessing(true);
    
    try {
      console.log(`[ReportageAI] Analyzing ${frames.length} video frames with Gemini 2.5 Pro...`);
      
      // Gemini 2.5 Pro handles multiple frames natively with temporal understanding
      const { data, error } = await supabase.functions.invoke('gemini-analyze-media', {
        body: {
          videoFrames: frames,
          context: `Lieu: ${locationName}, Zone: ${zoneType}`,
          mode
        }
      });

      if (error) throw error;

      // Map Gemini response to our format
      const geminiAnalysis = data.analysis;
      const analysis: AnalysisResult = {
        elements: (geminiAnalysis.elements || []).map((el: any) => ({
          name: el.label,
          state: el.state === 'hors_service' ? 'tres_degrade' : el.state,
          material: el.material,
          description: el.anomalies?.join(', ')
        })),
        anomalies: (geminiAnalysis.anomalies || []).map((a: any) => ({
          type: a.type,
          severity: a.severity === 'critique' ? 'high' : a.severity === 'majeur' ? 'high' : a.severity === 'modéré' ? 'medium' : 'low',
          description: a.description,
          location: a.location
        })),
        description: geminiAnalysis.description || '',
        etat_general: geminiAnalysis.global_state || 'bon',
        roomType: geminiAnalysis.room_type
      };

      setLastAnalysis(analysis);
      onAnalysis?.(analysis);
      
      console.log('[ReportageAI] Video analysis complete (Gemini 2.5 Pro native)');
      
      // Auto-extract tasks
      if (analysis.anomalies?.length > 0) {
        addToQueue(async () => { await extractTasksFromAnalysis(analysis); });
      }
      
      return analysis;
    } catch (error) {
      console.error('[ReportageAI] Video analysis error:', error);
      onError?.(error instanceof Error ? error : new Error('Video analysis failed'));
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [locationName, zoneType, onAnalysis, onError, addToQueue]);

  // ============= TASK EXTRACTION =============

  const extractTasksFromAnalysis = useCallback(async (analysis: AnalysisResult): Promise<ExtractedTask[]> => {
    try {
      console.log('[ReportageAI] Extracting tasks from analysis...');
      
      const tasks: ExtractedTask[] = [];
      
      // Generate tasks from anomalies
      for (const anomaly of analysis.anomalies || []) {
        const priority = anomaly.severity === 'high' ? 'urgent' 
          : anomaly.severity === 'medium' ? 'high' 
          : 'medium';
        
        tasks.push({
          title: `Réparer: ${anomaly.type}`,
          description: `${anomaly.description}${anomaly.location ? ` - ${anomaly.location}` : ''}`,
          priority,
          category: anomaly.type
        });
      }
      
      // Generate tasks from degraded elements
      for (const element of analysis.elements || []) {
        if (element.state === 'degrade' || element.state === 'tres_degrade') {
          tasks.push({
            title: `Remettre en état: ${element.name}`,
            description: element.description || `${element.name} en état ${element.state.replace('_', ' ')}`,
            priority: element.state === 'tres_degrade' ? 'high' : 'medium',
            category: element.material
          });
        }
      }
      
      setExtractedTasks(prev => [...prev, ...tasks]);
      onTasksExtracted?.(tasks);
      
      console.log(`[ReportageAI] Extracted ${tasks.length} tasks`);
      
      return tasks;
    } catch (error) {
      console.error('[ReportageAI] Task extraction error:', error);
      return [];
    }
  }, [onTasksExtracted]);

  // ============= CAPTURE FLOW =============

  const capturePhoto = useCallback(async (photoData: string): Promise<CaptureResult | null> => {
    setCurrentMode('photo');
    
    try {
      const analysis = await analyzeImage(photoData);
      
      const result: CaptureResult = {
        id: crypto.randomUUID(),
        type: 'photo',
        timestamp: new Date(),
        mediaUrl: photoData,
        analysis: analysis || undefined,
        tasks: extractedTasks
      };
      
      setCaptureHistory(prev => [...prev, result]);
      onCaptureComplete?.(result);
      
      return result;
    } finally {
      setCurrentMode('idle');
    }
  }, [analyzeImage, extractedTasks, onCaptureComplete]);

  const captureVideoFrames = useCallback(async (
    frames: Array<{ base64?: string; url?: string }>
  ): Promise<CaptureResult | null> => {
    setCurrentMode('video');
    
    try {
      const analysis = await analyzeVideoFrames(frames);
      
      const result: CaptureResult = {
        id: crypto.randomUUID(),
        type: 'video',
        timestamp: new Date(),
        analysis: analysis || undefined,
        tasks: extractedTasks
      };
      
      setCaptureHistory(prev => [...prev, result]);
      onCaptureComplete?.(result);
      
      return result;
    } finally {
      setCurrentMode('idle');
    }
  }, [analyzeVideoFrames, extractedTasks, onCaptureComplete]);

  // ============= VOICE CONTROLS =============

  const startVoiceCapture = useCallback(async () => {
    setCurrentMode('voice');
    await realtime.connect();
  }, [realtime]);

  const stopVoiceCapture = useCallback(async () => {
    realtime.disconnect();
    setCurrentMode('idle');
    
    // Create capture result with last transcript
    if (realtime.lastTranscript) {
      const result: CaptureResult = {
        id: crypto.randomUUID(),
        type: 'voice',
        timestamp: new Date(),
        transcript: realtime.lastTranscript
      };
      
      setCaptureHistory(prev => [...prev, result]);
      onCaptureComplete?.(result);
    }
  }, [realtime, onCaptureComplete]);

  // ============= HYBRID MODE =============

  const captureWithVoice = useCallback(async (photoData: string): Promise<CaptureResult | null> => {
    // Start voice for context while analyzing photo
    if (!realtime.isConnected) {
      await realtime.connect();
    }
    
    // Analyze photo in parallel
    const analysis = await analyzeImage(photoData);
    
    // Create result combining both
    const result: CaptureResult = {
      id: crypto.randomUUID(),
      type: 'photo',
      timestamp: new Date(),
      mediaUrl: photoData,
      transcript: realtime.lastTranscript,
      analysis: analysis || undefined,
      tasks: extractedTasks
    };
    
    setCaptureHistory(prev => [...prev, result]);
    onCaptureComplete?.(result);
    
    return result;
  }, [realtime, analyzeImage, extractedTasks, onCaptureComplete]);

  // ============= CLEANUP =============

  useEffect(() => {
    return () => {
      realtime.disconnect();
    };
  }, [realtime]);

  // ============= RETURN =============

  return {
    // State
    isProcessing,
    currentMode,
    lastAnalysis,
    extractedTasks,
    captureHistory,
    
    // Voice state (from realtime)
    isVoiceConnected: realtime.isConnected,
    isVoiceConnecting: realtime.isConnecting,
    isAISpeaking: realtime.isSpeaking,
    lastTranscript: realtime.lastTranscript,
    
    // Actions
    analyzeImage,
    analyzeVideoFrames,
    extractTasksFromAnalysis,
    
    // Capture flows
    capturePhoto,
    captureVideoFrames,
    captureWithVoice,
    
    // Voice controls
    startVoiceCapture,
    stopVoiceCapture,
    sendVoiceMessage: realtime.sendMessage,
    
    // Reset
    clearHistory: () => {
      setCaptureHistory([]);
      setExtractedTasks([]);
      setLastAnalysis(null);
    }
  };
}
