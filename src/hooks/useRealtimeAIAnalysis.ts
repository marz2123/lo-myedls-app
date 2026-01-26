import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIAnalysisResult {
  zones: Array<{
    type: string;
    label: string;
    confidence: number;
  }>;
  pathologies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
  }>;
  elements: Array<{
    type: string;
    label: string;
    condition?: 'good' | 'medium' | 'poor';
  }>;
  suggestedDescription?: string;
}

interface UseRealtimeAIAnalysisOptions {
  enabled?: boolean;
  intervalMs?: number;
  onAnalysisComplete?: (result: AIAnalysisResult) => void;
  onCriticalPathologyDetected?: (pathology: AIAnalysisResult['pathologies'][0]) => void;
}

export const useRealtimeAIAnalysis = (options: UseRealtimeAIAnalysisOptions = {}) => {
  const {
    enabled = false,
    intervalMs = 3000,
    onAnalysisComplete,
    onCriticalPathologyDetected,
  } = options;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Capture frame from video
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  // Analyze image with AI
  const analyzeImage = useCallback(async (imageBase64: string): Promise<AIAnalysisResult | null> => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('analyze-video-frame', {
        body: {
          imageBase64: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          context: 'realtime_inspection',
          detectZones: true,
          detectPathologies: true,
          detectElements: true,
        },
      });

      if (fnError) throw fnError;

      const result: AIAnalysisResult = {
        zones: data?.zones || [],
        pathologies: data?.pathologies || [],
        elements: data?.elements || [],
        suggestedDescription: data?.suggestedDescription,
      };

      setLastResult(result);
      onAnalysisComplete?.(result);

      // Check for critical pathologies
      const criticalPathologies = result.pathologies.filter(p => p.severity === 'critical');
      if (criticalPathologies.length > 0) {
        criticalPathologies.forEach(p => {
          onCriticalPathologyDetected?.(p);
        });

        // Haptic alert
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }

        toast.error(`⚠️ Pathologie critique: ${criticalPathologies[0].description}`, {
          duration: 5000,
        });
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI analysis failed';
      setError(message);
      console.error('AI analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [onAnalysisComplete, onCriticalPathologyDetected]);

  // Manual analysis trigger
  const analyze = useCallback(async (imageData?: string) => {
    const image = imageData || captureFrame();
    if (!image) {
      console.warn('No image available for analysis');
      return null;
    }
    return analyzeImage(image);
  }, [captureFrame, analyzeImage]);

  // Start continuous analysis
  const startContinuousAnalysis = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    videoRef.current = video;
    canvasRef.current = canvas;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (enabled && !isAnalyzing) {
        const frame = captureFrame();
        if (frame) {
          analyzeImage(frame);
        }
      }
    }, intervalMs);
  }, [enabled, isAnalyzing, intervalMs, captureFrame, analyzeImage]);

  // Stop continuous analysis
  const stopContinuousAnalysis = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    videoRef.current = null;
    canvasRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-stop when disabled
  useEffect(() => {
    if (!enabled && intervalRef.current) {
      stopContinuousAnalysis();
    }
  }, [enabled, stopContinuousAnalysis]);

  return {
    isAnalyzing,
    lastResult,
    error,
    analyze,
    startContinuousAnalysis,
    stopContinuousAnalysis,
    detectedZones: lastResult?.zones || [],
    detectedPathologies: lastResult?.pathologies || [],
    detectedElements: lastResult?.elements || [],
    suggestedDescription: lastResult?.suggestedDescription,
  };
};
