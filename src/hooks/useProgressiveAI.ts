// Progressive AI Rendering Hook
// Enables streaming AI results as they arrive

import { useState, useCallback, useRef } from 'react';
import { cacheService } from '@/services/cacheService';
import { aiRobustnessLayer, CONFIDENCE_THRESHOLDS } from '@/services/aiRobustnessLayer';
import { eventLogger } from '@/services/eventLogger';

interface ProgressiveResult<T> {
  data: T[];
  isComplete: boolean;
  progress: number;
  errors: string[];
}

interface UseProgressiveAIOptions {
  enableCaching?: boolean;
  enableConsistencyCheck?: boolean;
  onPartialResult?: (result: any) => void;
  onComplete?: (results: any[]) => void;
  onError?: (error: string) => void;
}

export const useProgressiveAI = <T = any>(options: UseProgressiveAIOptions = {}) => {
  const {
    enableCaching = true,
    enableConsistencyCheck = true,
    onPartialResult,
    onComplete,
    onError,
  } = options;

  const [results, setResults] = useState<ProgressiveResult<T>>({
    data: [],
    isComplete: false,
    progress: 0,
    errors: [],
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add a single result progressively
  const addResult = useCallback((result: T, confidenceScore?: number) => {
    // Add confidence score if not present
    const enrichedResult = {
      ...result,
      confidenceScore: confidenceScore ?? aiRobustnessLayer.calculateConfidenceScore(result),
      needsVerification: confidenceScore !== undefined && confidenceScore < CONFIDENCE_THRESHOLDS.NEEDS_VERIFICATION,
    };

    setResults(prev => ({
      ...prev,
      data: [...prev.data, enrichedResult as T],
      progress: prev.progress + 1,
    }));

    onPartialResult?.(enrichedResult);
  }, [onPartialResult]);

  // Process multiple items in parallel with progressive updates
  const processInParallel = useCallback(async <I>(
    items: I[],
    processor: (item: I, index: number) => Promise<T>,
    cacheKeyGenerator?: (item: I) => string
  ) => {
    setIsProcessing(true);
    setResults({ data: [], isComplete: false, progress: 0, errors: [] });
    abortControllerRef.current = new AbortController();

    const totalItems = items.length;
    const processedResults: T[] = [];
    const errors: string[] = [];

    // Process items in parallel batches
    const batchSize = 3; // Process 3 items at a time
    
    for (let i = 0; i < items.length; i += batchSize) {
      if (abortControllerRef.current.signal.aborted) break;

      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item, batchIndex) => {
        const itemIndex = i + batchIndex;
        const cacheKey = cacheKeyGenerator?.(item);

        // Check cache first
        if (enableCaching && cacheKey) {
          const cached = cacheService.get<T>(cacheKey);
          if (cached) {
            addResult(cached);
            processedResults.push(cached);
            return;
          }
        }

        // Process item with retries
        const { data, error } = await aiRobustnessLayer.callWithRetry(
          () => processor(item, itemIndex)
        );

        if (error) {
          errors.push(`Item ${itemIndex}: ${error}`);
          eventLogger.logAIError(error, 'progressive_processing', { itemIndex });
          onError?.(error);
        } else if (data) {
          // Cache result
          if (enableCaching && cacheKey) {
            cacheService.set(cacheKey, data, 30 * 60 * 1000);
          }
          
          addResult(data);
          processedResults.push(data);
        }

        // Update progress
        setResults(prev => ({
          ...prev,
          progress: Math.round(((i + batchIndex + 1) / totalItems) * 100),
        }));
      });

      await Promise.all(batchPromises);
    }

    // Run consistency check if enabled
    let finalResults = processedResults;
    if (enableConsistencyCheck && processedResults.length > 0) {
      const { tasks, corrections } = await aiRobustnessLayer.runConsistencyCheck(
        processedResults as any[]
      );
      finalResults = tasks as T[];
      
      if (corrections.length > 0) {
        eventLogger.log({
          category: 'ai',
          action: 'consistency_check',
          metadata: { corrections },
        });
      }
    }

    setResults({
      data: finalResults,
      isComplete: true,
      progress: 100,
      errors,
    });

    setIsProcessing(false);
    onComplete?.(finalResults);

    return finalResults;
  }, [enableCaching, enableConsistencyCheck, addResult, onComplete, onError]);

  // Process streaming response
  const processStream = useCallback(async (
    streamFn: () => Promise<ReadableStream<Uint8Array>>,
    parser: (chunk: string) => T | null
  ) => {
    setIsProcessing(true);
    setResults({ data: [], isComplete: false, progress: 0, errors: [] });

    try {
      const stream = await streamFn();
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Try to parse complete chunks
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const result = parser(line);
            if (result) {
              addResult(result);
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const result = parser(buffer);
        if (result) {
          addResult(result);
        }
      }

      setResults(prev => ({ ...prev, isComplete: true, progress: 100 }));
    } catch (error: any) {
      const errorMessage = error.message || 'Stream processing failed';
      setResults(prev => ({
        ...prev,
        errors: [...prev.errors, errorMessage],
        isComplete: true,
      }));
      eventLogger.logAIError(error, 'stream_processing');
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [addResult, onError]);

  // Cancel ongoing processing
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    setResults(prev => ({ ...prev, isComplete: true }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setResults({ data: [], isComplete: false, progress: 0, errors: [] });
    setIsProcessing(false);
  }, []);

  return {
    results,
    isProcessing,
    processInParallel,
    processStream,
    addResult,
    cancel,
    reset,
  };
};

export default useProgressiveAI;
